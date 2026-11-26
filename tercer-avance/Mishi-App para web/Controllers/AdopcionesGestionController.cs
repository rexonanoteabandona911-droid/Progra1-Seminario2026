using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace MishiApi.Controllers
{
    [ApiController]
    [Route("api/gestion-adopciones")]
    public class AdopcionesGestionController : ControllerBase
    {
        private readonly IConfiguration _config;

        public AdopcionesGestionController(IConfiguration config)
        {
            _config = config;
        }

        public class AdopcionRequest
        {
            public int? id_solicitud { get; set; }
            public string? nombre_Adoptante { get; set; }
            public string? nombre_Gato { get; set; }
            public string? fecha_Adopcion { get; set; }
            public string? observaciones { get; set; }
        }

        private string ConnectionString =>
            _config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("No se encontró la cadena de conexión 'DefaultConnection'.");

        [HttpGet]
        public IActionResult Listar()
        {
            var lista = new List<object>();

            try
            {
                using var conn = new SqlConnection(ConnectionString);
                conn.Open();

                var sql = @"
                    SELECT
                        d.id_adopcion,
                        d.id_solicitud,
                        COALESCE(NULLIF(LTRIM(RTRIM(d.Nombre_Adoptante)), ''), u.Nombre, 'Sin adoptante') AS Nombre_Adoptante,
                        COALESCE(NULLIF(LTRIM(RTRIM(d.Nombre_Gato)), ''), g.Nombre, 'Sin gato') AS Nombre_Gato,
                        d.Fecha_Adopcion,
                        d.Observaciones
                    FROM dbo.Adopciones d
                    LEFT JOIN dbo.Solicitudes s ON s.Id = d.id_solicitud
                    LEFT JOIN dbo.Usuarios u ON u.Id = s.UsuarioId
                    LEFT JOIN dbo.Gatos g ON g.Id = s.id_gato
                    ORDER BY d.id_adopcion ASC;";

                using var cmd = new SqlCommand(sql, conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    lista.Add(new
                    {
                        id_adopcion = Convert.ToInt32(reader["id_adopcion"]),
                        id_solicitud = reader["id_solicitud"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["id_solicitud"]),
                        nombre_Adoptante = reader["Nombre_Adoptante"]?.ToString() ?? "",
                        nombre_Gato = reader["Nombre_Gato"]?.ToString() ?? "",
                        fecha_Adopcion = reader["Fecha_Adopcion"] == DBNull.Value
                            ? ""
                            : Convert.ToDateTime(reader["Fecha_Adopcion"]).ToString("yyyy-MM-dd"),
                        observaciones = reader["Observaciones"] == DBNull.Value ? "" : reader["Observaciones"]?.ToString() ?? ""
                    });
                }

                return Ok(lista);
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { message = "Error de base de datos al consultar adopciones: " + ex.Message });
            }
        }

        [HttpGet("solicitudes")]
        public IActionResult ListarSolicitudes()
        {
            var solicitudes = new List<object>();

            try
            {
                using var conn = new SqlConnection(ConnectionString);
                conn.Open();

                var sql = @"
                    SELECT
                        s.Id,
                        COALESCE(u.Nombre, 'Sin adoptante') AS Adoptante,
                        COALESCE(g.Nombre, 'Sin gato') AS Gato
                    FROM dbo.Solicitudes s
                    LEFT JOIN dbo.Usuarios u ON u.Id = s.UsuarioId
                    LEFT JOIN dbo.Gatos g ON g.Id = s.id_gato
                    ORDER BY s.Id DESC;";

                using var cmd = new SqlCommand(sql, conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    int idSol = Convert.ToInt32(reader["Id"]);
                    string adop = reader["Adoptante"]?.ToString() ?? "Sin adoptante";
                    string gat = reader["Gato"]?.ToString() ?? "Sin gato";
                    solicitudes.Add(new
                    {
                        id = idSol,
                        texto = $"Solicitud #{idSol} - {adop} ({gat})"
                    });
                }

                return Ok(solicitudes);
            }
            catch (SqlException)
            {
                return Ok(solicitudes);
            }
        }

        [HttpPost]
        public IActionResult Agregar([FromBody] AdopcionRequest? req)
        {
            if (req == null)
                return BadRequest(new { message = "No se recibieron datos válidos para registrar la adopción." });

            string adoptante = (req.nombre_Adoptante ?? "").Trim();
            string gato = (req.nombre_Gato ?? "").Trim();

            try
            {
                using var conn = new SqlConnection(ConnectionString);
                conn.Open();

                if (req.id_solicitud.HasValue && (string.IsNullOrWhiteSpace(adoptante) || string.IsNullOrWhiteSpace(gato)))
                {
                    var sqlSol = @"
                        SELECT
                            u.Nombre AS NombreUsuario,
                            g.Nombre AS NombreGato
                        FROM dbo.Solicitudes s
                        LEFT JOIN dbo.Usuarios u ON u.Id = s.UsuarioId
                        LEFT JOIN dbo.Gatos g ON g.Id = s.id_gato
                        WHERE s.Id = @IdSolicitud;";

                    using var cmdSol = new SqlCommand(sqlSol, conn);
                    cmdSol.Parameters.AddWithValue("@IdSolicitud", req.id_solicitud.Value);
                    using var rSol = cmdSol.ExecuteReader();
                    if (rSol.Read())
                    {
                        if (string.IsNullOrWhiteSpace(adoptante) && rSol["NombreUsuario"] != DBNull.Value)
                            adoptante = rSol["NombreUsuario"].ToString()!.Trim();

                        if (string.IsNullOrWhiteSpace(gato) && rSol["NombreGato"] != DBNull.Value)
                            gato = rSol["NombreGato"].ToString()!.Trim();
                    }
                }

                if (string.IsNullOrWhiteSpace(adoptante) || string.IsNullOrWhiteSpace(gato))
                    return BadRequest(new { message = "Debes ingresar el nombre del adoptante y el nombre del gato." });

                DateTime fecha = DateTime.Today;
                if (!string.IsNullOrWhiteSpace(req.fecha_Adopcion) && DateTime.TryParse(req.fecha_Adopcion, out var parsedFecha))
                    fecha = parsedFecha.Date;

                var sql = @"
                    INSERT INTO dbo.Adopciones
                        (id_solicitud, Fecha_Adopcion, Observaciones, Nombre_Adoptante, Nombre_Gato)
                    VALUES
                        (@id_solicitud, @Fecha_Adopcion, @Observaciones, @Nombre_Adoptante, @Nombre_Gato);
                    SELECT CAST(SCOPE_IDENTITY() AS INT);";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@id_solicitud", (object?)req.id_solicitud ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Fecha_Adopcion", fecha);
                cmd.Parameters.AddWithValue("@Observaciones", string.IsNullOrWhiteSpace(req.observaciones) ? DBNull.Value : req.observaciones.Trim());
                cmd.Parameters.AddWithValue("@Nombre_Adoptante", adoptante);
                cmd.Parameters.AddWithValue("@Nombre_Gato", gato);

                var nuevoId = Convert.ToInt32(cmd.ExecuteScalar());
                return Ok(new { id_adopcion = nuevoId, message = "Adopción registrada correctamente." });
            }
            catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
            {
                return BadRequest(new { message = "Ya existe un registro con ese valor único en Adopciones (revisa las restricciones UNIQUE de la tabla)." });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { message = "La solicitud seleccionada no existe o infringe una restricción de clave foránea en Adopciones." });
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { message = "Error de base de datos al registrar: " + ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public IActionResult Modificar(int id, [FromBody] AdopcionRequest? req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.nombre_Adoptante) || string.IsNullOrWhiteSpace(req.nombre_Gato))
                return BadRequest(new { message = "Debes ingresar el nombre del adoptante y el nombre del gato." });

            DateTime fecha = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(req.fecha_Adopcion) && DateTime.TryParse(req.fecha_Adopcion, out var parsedFecha))
                fecha = parsedFecha.Date;

            try
            {
                using var conn = new SqlConnection(ConnectionString);
                conn.Open();

                var sql = @"
                    UPDATE dbo.Adopciones
                    SET
                        id_solicitud = @id_solicitud,
                        Nombre_Adoptante = @Nombre_Adoptante,
                        Nombre_Gato = @Nombre_Gato,
                        Fecha_Adopcion = @Fecha_Adopcion,
                        Observaciones = @Observaciones
                    WHERE id_adopcion = @Id;";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.Parameters.AddWithValue("@id_solicitud", (object?)req.id_solicitud ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Nombre_Adoptante", req.nombre_Adoptante.Trim());
                cmd.Parameters.AddWithValue("@Nombre_Gato", req.nombre_Gato.Trim());
                cmd.Parameters.AddWithValue("@Fecha_Adopcion", fecha);
                cmd.Parameters.AddWithValue("@Observaciones", string.IsNullOrWhiteSpace(req.observaciones) ? DBNull.Value : req.observaciones.Trim());

                var filas = cmd.ExecuteNonQuery();
                if (filas == 0)
                    return NotFound(new { message = "No se encontró la adopción indicada." });

                return Ok(new { message = "Adopción actualizada correctamente." });
            }
            catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
            {
                return BadRequest(new { message = "Ya existe un registro con ese valor único en Adopciones." });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { message = "La solicitud seleccionada no existe o infringe una restricción en Adopciones." });
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { message = "Error de base de datos al modificar: " + ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public IActionResult Eliminar(int id)
        {
            try
            {
                using var conn = new SqlConnection(ConnectionString);
                conn.Open();

                var sql = "DELETE FROM dbo.Adopciones WHERE id_adopcion = @Id;";
                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@Id", id);

                var filas = cmd.ExecuteNonQuery();
                if (filas == 0)
                    return NotFound(new { message = "No se encontró la adopción indicada." });

                return Ok(new { message = "Adopción eliminada correctamente." });
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { message = "Error de base de datos al eliminar: " + ex.Message });
            }
        }
    }
}
