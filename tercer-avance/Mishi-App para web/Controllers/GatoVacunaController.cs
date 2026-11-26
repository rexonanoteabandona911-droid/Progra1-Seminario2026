using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Globalization;

[ApiController]
[Route("api/GatoVacuna")]
public class GatoVacunaController : ControllerBase
{
    private readonly string cs;

    public GatoVacunaController(IConfiguration config)
    {
        cs = config.GetConnectionString("MishiApi")
             ?? "Server=kimby-pc\\sqlexpress;Database=MishiApi;Trusted_Connection=True;TrustServerCertificate=True";
    }
    public class GatoVacunaInput
    {
        public int IdGato { get; set; }
        public int IdVacuna { get; set; }
        public string? FechaAplicacion { get; set; }
        public string? ProximaDosis { get; set; }
    }
    static string Txt(SqlDataReader r, int i) => r.IsDBNull(i) ? "" : Convert.ToString(r.GetValue(i)) ?? "";
    static int Num(SqlDataReader r, int i) => r.IsDBNull(i) ? 0 : Convert.ToInt32(r.GetValue(i));
    static string Dia(SqlDataReader r, int i) =>
        r.IsDBNull(i) ? "" : Convert.ToDateTime(r.GetValue(i)).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    static DateTime? Fecha(string? f) =>
        DateTime.TryParse(f, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d.Date : (DateTime?)null;

    static string? Validar(GatoVacunaInput d)
    {
        if (d.IdGato <= 0) return "Selecciona el gato.";
        if (d.IdVacuna <= 0) return "Selecciona la vacuna.";
        var aplicacion = Fecha(d.FechaAplicacion);
        if (aplicacion == null) return "La fecha de aplicación es obligatoria.";
        if (aplicacion.Value > DateTime.Today) return "La fecha de aplicación no puede ser futura.";
        var proxima = Fecha(d.ProximaDosis);
        if (proxima != null && proxima.Value <= aplicacion.Value)
            return "La próxima dosis debe ser posterior a la fecha de aplicación.";
        return null;
    }

    private IActionResult Fallo(Exception ex, string porRelacion)
    {
        if (ex is SqlException sql)
        {
            if (sql.Number == 547) return Conflict(new { mensaje = porRelacion });
            if (sql.Number == 515)
                return BadRequest(new { mensaje = "Falta un dato obligatorio en la base de datos: " + sql.Message });
        }
        return StatusCode(500, new { mensaje = ex.Message });
    }
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            const string sql = @"SELECT gv.id_gato_vacuna, gv.id_gato, g.Nombre,
                                        gv.id_vacuna, v.Nombre,
                                        gv.Fecha_Aplicacion, gv.Proxima_Dosis
                                 FROM Gato_Vacuna gv
                                 LEFT JOIN Gatos g ON g.Id = gv.id_gato
                                 LEFT JOIN Vacunas v ON v.id_vacuna = gv.id_vacuna
                                 ORDER BY gv.Fecha_Aplicacion ASC, gv.id_gato_vacuna ASC";
            using var cmd = new SqlCommand(sql, con);
            using var r = await cmd.ExecuteReaderAsync();

            var lista = new List<object>();
            while (await r.ReadAsync())
            {
                lista.Add(new
                {
                    id = Num(r, 0),
                    idGato = Num(r, 1),
                    gato = Txt(r, 2),
                    idVacuna = Num(r, 3),
                    vacuna = Txt(r, 4),
                    fechaAplicacion = Dia(r, 5),
                    proximaDosis = Dia(r, 6)
                });
            }
            return Ok(lista);
        }
        catch (Exception ex) { return Fallo(ex, ""); }
    }
    [HttpGet("gatos")]
    public async Task<IActionResult> Gatos()
    {
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using var cmd = new SqlCommand("SELECT Id, Nombre FROM Gatos ORDER BY Nombre", con);
            using var r = await cmd.ExecuteReaderAsync();

            var lista = new List<object>();
            while (await r.ReadAsync())
                lista.Add(new { id = Num(r, 0), nombre = Txt(r, 1) });
            return Ok(lista);
        }
        catch (Exception ex) { return Fallo(ex, ""); }
    }

    [HttpGet("vacunas")]
    public async Task<IActionResult> Vacunas()
    {
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using var cmd = new SqlCommand("SELECT id_vacuna, Nombre FROM Vacunas ORDER BY Nombre", con);
            using var r = await cmd.ExecuteReaderAsync();

            var lista = new List<object>();
            while (await r.ReadAsync())
                lista.Add(new { id = Num(r, 0), nombre = Txt(r, 1) });
            return Ok(lista);
        }
        catch (Exception ex) { return Fallo(ex, ""); }
    }
    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] GatoVacunaInput d)
    {
        var error = Validar(d);
        if (error != null) return BadRequest(new { mensaje = error });
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();

            using (var dup = new SqlCommand(
                @"SELECT COUNT(*) FROM Gato_Vacuna
                  WHERE id_gato=@g AND id_vacuna=@v AND Fecha_Aplicacion=@f", con))
            {
                dup.Parameters.AddWithValue("@g", d.IdGato);
                dup.Parameters.AddWithValue("@v", d.IdVacuna);
                dup.Parameters.AddWithValue("@f", Fecha(d.FechaAplicacion)!.Value);
                if (Convert.ToInt32(await dup.ExecuteScalarAsync()) > 0)
                    return Conflict(new { mensaje = "Ese gato ya tiene esa vacuna en esa fecha." });
            }

            var proxima = Fecha(d.ProximaDosis);
            object proximaDosis = proxima.HasValue ? (object)proxima.Value : DBNull.Value;

            using var cmd = new SqlCommand(
                @"INSERT INTO Gato_Vacuna (id_gato, id_vacuna, Fecha_Aplicacion, Proxima_Dosis)
                  VALUES (@g, @v, @f, @p)", con);
            cmd.Parameters.AddWithValue("@g", d.IdGato);
            cmd.Parameters.AddWithValue("@v", d.IdVacuna);
            cmd.Parameters.AddWithValue("@f", Fecha(d.FechaAplicacion)!.Value);
            cmd.Parameters.AddWithValue("@p", proximaDosis);
            await cmd.ExecuteNonQueryAsync();

            return Ok(new { mensaje = "Vacuna registrada" });
        }
        catch (Exception ex) { return Fallo(ex, "El gato o la vacuna seleccionados no existen."); }
    }
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Modificar(int id, [FromBody] GatoVacunaInput d)
    {
        var error = Validar(d);
        if (error != null) return BadRequest(new { mensaje = error });
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();

            using (var dup = new SqlCommand(
                @"SELECT COUNT(*) FROM Gato_Vacuna
                  WHERE id_gato=@g AND id_vacuna=@v AND Fecha_Aplicacion=@f AND id_gato_vacuna<>@id", con))
            {
                dup.Parameters.AddWithValue("@g", d.IdGato);
                dup.Parameters.AddWithValue("@v", d.IdVacuna);
                dup.Parameters.AddWithValue("@f", Fecha(d.FechaAplicacion)!.Value);
                dup.Parameters.AddWithValue("@id", id);
                if (Convert.ToInt32(await dup.ExecuteScalarAsync()) > 0)
                    return Conflict(new { mensaje = "Ese gato ya tiene esa vacuna en esa fecha." });
            }

            var proxima = Fecha(d.ProximaDosis);
            object proximaDosis = proxima.HasValue ? (object)proxima.Value : DBNull.Value;

            using var cmd = new SqlCommand(
                @"UPDATE Gato_Vacuna
                  SET id_gato=@g, id_vacuna=@v, Fecha_Aplicacion=@f, Proxima_Dosis=@p
                  WHERE id_gato_vacuna=@id", con);
            cmd.Parameters.AddWithValue("@g", d.IdGato);
            cmd.Parameters.AddWithValue("@v", d.IdVacuna);
            cmd.Parameters.AddWithValue("@f", Fecha(d.FechaAplicacion)!.Value);
            cmd.Parameters.AddWithValue("@p", proximaDosis);
            cmd.Parameters.AddWithValue("@id", id);

            if (await cmd.ExecuteNonQueryAsync() == 0)
                return NotFound(new { mensaje = "No se encontró el registro." });
            return Ok(new { mensaje = "Registro actualizado" });
        }
        catch (Exception ex) { return Fallo(ex, "El gato o la vacuna seleccionados no existen."); }
    }
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using var cmd = new SqlCommand("DELETE FROM Gato_Vacuna WHERE id_gato_vacuna=@id", con);
            cmd.Parameters.AddWithValue("@id", id);

            if (await cmd.ExecuteNonQueryAsync() == 0)
                return NotFound(new { mensaje = "No se encontró el registro." });
            return Ok(new { mensaje = "Registro eliminado" });
        }
        catch (Exception ex)
        {
            return Fallo(ex, "No se puede eliminar: hay otros registros que dependen de este.");
        }
    }
}
