using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Mishi_App_para_web.Controllers
{
    [ApiController]
    [Route("api/reportes-calles")]
    public class ReportesCallesController : ControllerBase
    {
        private readonly string _conexion;

        public ReportesCallesController(IConfiguration configuration)
        {
            _conexion = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("No se encontró ConnectionStrings:DefaultConnection en appsettings.json.");
        }

        public class ReporteDto
        {
            public int? IdUsuario { get; set; }
            public int? IdRescatista { get; set; }
            public string? Direccion { get; set; }
            public string? Descripcion { get; set; }
            public int CantidadGatos { get; set; }
            public DateTime FechaReporte { get; set; }
            public string? Estado { get; set; }
            public DateTime? FechaAtencion { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerReportes()
        {
            const string sql = @"
SELECT r.id_reporte, r.id_usuario, r.id_rescatista, r.Direccion,
       r.Descripcion, r.Cantidad_Gatos, r.Fecha_Reporte, r.Estado,
       r.Fecha_Atencion, u.Nombre AS Reportante,
       ur.Nombre AS Rescatista, rs.Zona
FROM Reportes_Calle r
LEFT JOIN Usuarios u ON u.Id = r.id_usuario
LEFT JOIN Rescatistas rs ON rs.id_rescatista = r.id_rescatista
LEFT JOIN Usuarios ur ON ur.Id = rs.id_usuario
ORDER BY r.id_reporte DESC;";

            var lista = new List<object>();
            await using var con = new SqlConnection(_conexion);
            await con.OpenAsync();
            await using var cmd = new SqlCommand(sql, con);
            await using var rd = await cmd.ExecuteReaderAsync();

            while (await rd.ReadAsync())
            {
                lista.Add(new
                {
                    id = rd.GetInt32(0),
                    idUsuario = rd.IsDBNull(1) ? (int?)null : rd.GetInt32(1),
                    idRescatista = rd.IsDBNull(2) ? (int?)null : rd.GetInt32(2),
                    direccion = rd.IsDBNull(3) ? "" : rd.GetString(3),
                    descripcion = rd.IsDBNull(4) ? "" : rd.GetString(4),
                    cantidadGatos = rd.IsDBNull(5) ? 0 : Convert.ToInt32(rd.GetValue(5)),
                    fechaReporte = rd.IsDBNull(6) ? "" : Convert.ToDateTime(rd.GetValue(6)).ToString("yyyy-MM-dd"),
                    estado = rd.IsDBNull(7) ? "" : rd.GetString(7),
                    fechaAtencion = rd.IsDBNull(8) ? "" : Convert.ToDateTime(rd.GetValue(8)).ToString("yyyy-MM-dd"),
                    reportante = rd.IsDBNull(9) ? "Usuario no disponible" : rd.GetString(9),
                    rescatista = rd.IsDBNull(10) ? "Sin asignar" : rd.GetString(10),
                    zona = rd.IsDBNull(11) ? "" : rd.GetString(11)
                });
            }
            return Ok(lista);
        }

        [HttpGet("usuarios")]
        public async Task<IActionResult> ObtenerUsuarios()
        {
            const string sql = "SELECT Id, Nombre FROM Usuarios ORDER BY Nombre;";
            var lista = new List<object>();
            await using var con = new SqlConnection(_conexion);
            await con.OpenAsync();
            await using var cmd = new SqlCommand(sql, con);
            await using var rd = await cmd.ExecuteReaderAsync();
            while (await rd.ReadAsync())
            {
                lista.Add(new { id = rd.GetInt32(0), nombre = rd.IsDBNull(1) ? "" : rd.GetString(1) });
            }
            return Ok(lista);
        }

        [HttpGet("rescatistas")]
        public async Task<IActionResult> ObtenerRescatistas()
        {
            const string sql = @"
SELECT r.id_rescatista, r.Zona, r.Activo, u.Nombre
FROM Rescatistas r
LEFT JOIN Usuarios u ON u.Id = r.id_usuario
WHERE r.Activo = 1
ORDER BY u.Nombre;";
            var lista = new List<object>();
            await using var con = new SqlConnection(_conexion);
            await con.OpenAsync();
            await using var cmd = new SqlCommand(sql, con);
            await using var rd = await cmd.ExecuteReaderAsync();
            while (await rd.ReadAsync())
            {
                lista.Add(new
                {
                    id = rd.GetInt32(0),
                    zona = rd.IsDBNull(1) ? "" : rd.GetString(1),
                    activo = !rd.IsDBNull(2) && Convert.ToBoolean(rd.GetValue(2)),
                    nombre = rd.IsDBNull(3) ? "Rescatista" : rd.GetString(3)
                });
            }
            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> CrearReporte([FromBody] ReporteDto d)
        {
            var error = Validar(d);
            if (error != null) return BadRequest(new { mensaje = error });

            const string sql = @"
INSERT INTO Reportes_Calle
(id_usuario, id_rescatista, Direccion, Descripcion, Cantidad_Gatos, Fecha_Reporte, Estado, Fecha_Atencion)
OUTPUT INSERTED.id_reporte
VALUES
(@Usuario, @Rescatista, @Direccion, @Descripcion, @Cantidad, @FechaReporte, @Estado, @FechaAtencion);";

            await using var con = new SqlConnection(_conexion);
            await con.OpenAsync();
            await using var cmd = new SqlCommand(sql, con);
            AgregarParametros(cmd, d);
            var nuevoId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            return Ok(new { mensaje = "Reporte registrado correctamente.", id = nuevoId });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> ModificarReporte(int id, [FromBody] ReporteDto d)
        {
            var error = Validar(d);
            if (error != null) return BadRequest(new { mensaje = error });

            const string sql = @"
UPDATE Reportes_Calle SET
 id_usuario=@Usuario, id_rescatista=@Rescatista, Direccion=@Direccion,
 Descripcion=@Descripcion, Cantidad_Gatos=@Cantidad, Fecha_Reporte=@FechaReporte,
 Estado=@Estado, Fecha_Atencion=@FechaAtencion
WHERE id_reporte=@Id;";

            await using var con = new SqlConnection(_conexion);
            await con.OpenAsync();
            await using var cmd = new SqlCommand(sql, con);
            AgregarParametros(cmd, d);
            cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
            var filas = await cmd.ExecuteNonQueryAsync();
            if (filas == 0) return NotFound(new { mensaje = "No se encontró el reporte que deseas modificar." });
            return Ok(new { mensaje = "Reporte actualizado correctamente." });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> EliminarReporte(int id)
        {
            const string sql = "DELETE FROM Reportes_Calle WHERE id_reporte=@Id;";
            await using var con = new SqlConnection(_conexion);
            await con.OpenAsync();
            await using var cmd = new SqlCommand(sql, con);
            cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
            var filas = await cmd.ExecuteNonQueryAsync();
            if (filas == 0) return NotFound(new { mensaje = "No se encontró el reporte que deseas eliminar." });
            return Ok(new { mensaje = "Reporte eliminado correctamente." });
        }

        private static string? Validar(ReporteDto d)
        {
            if (d.IdUsuario == null || d.IdUsuario <= 0)
                return "Selecciona el usuario que realiza el reporte.";
            if (string.IsNullOrWhiteSpace(d.Direccion) || d.Direccion.Trim().Length < 3)
                return "Escribe una dirección de al menos 3 caracteres.";
            if (d.Direccion.Trim().Length > 200)
                return "La dirección no puede superar 200 caracteres.";
            if (d.Descripcion?.Length > 500)
                return "La descripción no puede superar 500 caracteres.";
            if (d.CantidadGatos < 1 || d.CantidadGatos > 999)
                return "La cantidad de gatos debe estar entre 1 y 999.";
            if (d.FechaReporte == default)
                return "Selecciona la fecha del reporte.";
            if (string.IsNullOrWhiteSpace(d.Estado))
                return "Selecciona el estado del reporte.";
            if (d.FechaAtencion.HasValue && d.FechaAtencion.Value.Date < d.FechaReporte.Date)
                return "La fecha de atención no puede ser anterior a la fecha del reporte.";
            return null;
        }

        private static void AgregarParametros(SqlCommand cmd, ReporteDto d)
        {
            cmd.Parameters.Add("@Usuario", SqlDbType.Int).Value = (object?)d.IdUsuario ?? DBNull.Value;
            cmd.Parameters.Add("@Rescatista", SqlDbType.Int).Value = (object?)d.IdRescatista ?? DBNull.Value;
            cmd.Parameters.Add("@Direccion", SqlDbType.NVarChar, 200).Value = d.Direccion!.Trim();
            cmd.Parameters.Add("@Descripcion", SqlDbType.NVarChar, 500).Value =
                string.IsNullOrWhiteSpace(d.Descripcion) ? DBNull.Value : d.Descripcion.Trim();
            cmd.Parameters.Add("@Cantidad", SqlDbType.Int).Value = d.CantidadGatos;
            cmd.Parameters.Add("@FechaReporte", SqlDbType.Date).Value = d.FechaReporte.Date;
            cmd.Parameters.Add("@Estado", SqlDbType.NVarChar, 30).Value = d.Estado!.Trim();
            cmd.Parameters.Add("@FechaAtencion", SqlDbType.Date).Value =
                (object?)d.FechaAtencion?.Date ?? DBNull.Value;
        }
    }
}

