using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

[ApiController]
[Route("api/adopciones")]
public class AdopcionesController : ControllerBase
{
    private readonly string cs;

    public AdopcionesController(IConfiguration config)
    {
        cs = config.GetConnectionString("MishiApi")
            ?? "Data Source=KIMBY-PC\\SQLEXPRESS;Initial Catalog=MishiApi;Integrated Security=True;Encrypt=True;Trust Server Certificate=True;";
    }

    public class AdopcionUnicaDto
    {
        public string nombreAdoptante { get; set; } = string.Empty;
        public string nombreGato { get; set; } = string.Empty;
        public DateTime? fechaAdopcion { get; set; }
        public string? observaciones { get; set; }
    }

    // GET: api/adopciones
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        using var con = new SqlConnection(cs);
        await con.OpenAsync();

        using var cmd = new SqlCommand(@"
            SELECT id_adopcion,
                   Nombre_Adoptante,
                   Nombre_Gato,
                   Fecha_Adopcion,
                   Observaciones
            FROM dbo.Adopciones
            ORDER BY id_adopcion ASC", con);

        using var r = await cmd.ExecuteReaderAsync();
        var lista = new List<object>();
        while (await r.ReadAsync())
        {
            lista.Add(new
            {
                id = r.GetInt32(0),
                adoptante = r.IsDBNull(1) ? "" : r.GetString(1),
                gato = r.IsDBNull(2) ? "" : r.GetString(2),
                fechaAdopcion = r.IsDBNull(3) ? DateTime.Today : r.GetDateTime(3),
                observaciones = r.IsDBNull(4) ? "" : r.GetString(4)
            });
        }

        return Ok(lista);
    }

    // POST: api/adopciones
    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] AdopcionUnicaDto d)
    {
        if (d == null || string.IsNullOrWhiteSpace(d.nombreAdoptante) || string.IsNullOrWhiteSpace(d.nombreGato))
            return BadRequest(new { mensaje = "Ingresa el nombre del adoptante y el nombre del gato." });

        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();

            var fecha = (d.fechaAdopcion ?? DateTime.Today).Date;
            var obs = string.IsNullOrWhiteSpace(d.observaciones) ? null : d.observaciones.Trim();

            using var c = new SqlCommand(@"
                INSERT INTO dbo.Adopciones (Nombre_Adoptante, Nombre_Gato, Fecha_Adopcion, Observaciones)
                OUTPUT INSERTED.id_adopcion
                VALUES (@a, @g, @f, @o)", con);

            c.Parameters.AddWithValue("@a", d.nombreAdoptante.Trim());
            c.Parameters.AddWithValue("@g", d.nombreGato.Trim());
            c.Parameters.AddWithValue("@f", fecha);
            c.Parameters.AddWithValue("@o", (object?)obs ?? DBNull.Value);

            var idAdopcion = Convert.ToInt32(await c.ExecuteScalarAsync());
            return Ok(new { mensaje = "Adopción registrada con éxito", id = idAdopcion });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "Error interno en el servidor: " + ex.Message });
        }
    }

    // PUT: api/adopciones/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Actualizar(int id, [FromBody] AdopcionUnicaDto d)
    {
        if (d == null || string.IsNullOrWhiteSpace(d.nombreAdoptante) || string.IsNullOrWhiteSpace(d.nombreGato))
            return BadRequest(new { mensaje = "Ingresa el nombre del adoptante y el nombre del gato." });

        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();

            var fecha = (d.fechaAdopcion ?? DateTime.Today).Date;
            var obs = string.IsNullOrWhiteSpace(d.observaciones) ? null : d.observaciones.Trim();

            using var c = new SqlCommand(@"
                UPDATE dbo.Adopciones
                SET Nombre_Adoptante = @a,
                    Nombre_Gato = @g,
                    Fecha_Adopcion = @f,
                    Observaciones = @o
                WHERE id_adopcion = @id", con);

            c.Parameters.AddWithValue("@id", id);
            c.Parameters.AddWithValue("@a", d.nombreAdoptante.Trim());
            c.Parameters.AddWithValue("@g", d.nombreGato.Trim());
            c.Parameters.AddWithValue("@f", fecha);
            c.Parameters.AddWithValue("@o", (object?)obs ?? DBNull.Value);

            int filas = await c.ExecuteNonQueryAsync();
            if (filas == 0)
                return NotFound(new { mensaje = "Adopción no encontrada." });

            return Ok(new { mensaje = "Adopción actualizada con éxito" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "Error interno en el servidor: " + ex.Message });
        }
    }

    // DELETE: api/adopciones/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();

            using var c = new SqlCommand("DELETE FROM dbo.Adopciones WHERE id_adopcion = @id", con);
            c.Parameters.AddWithValue("@id", id);

            int filas = await c.ExecuteNonQueryAsync();
            if (filas == 0)
                return NotFound(new { mensaje = "Adopción no encontrada." });

            return Ok(new { mensaje = "Adopción eliminada con éxito" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "Error interno en el servidor: " + ex.Message });
        }
    }
}