using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace MishiApi.Controllers
{
    [ApiController]
    [Route("api/solicitudes")]
    public class SolicitudesController : ControllerBase
    {
        private readonly IConfiguration _config;

        public SolicitudesController(IConfiguration config)
        {
            _config = config;
        }

        public class Solicitud
        {
            public int id { get; set; }
            public string usuario { get; set; } = "";
            public string gato { get; set; } = "";
            public string fecha { get; set; } = "";
            public string estado { get; set; } = "Pendiente";
        }

        private string ConnectionString =>
            _config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("No se encontró la cadena de conexión DefaultConnection.");

        private static (int Id, string NombreReal) ResolverUsuario(SqlConnection conn, string usuarioTexto)
        {
            var limpio = (usuarioTexto ?? "").Trim();

            if (int.TryParse(limpio, out var idDirecto))
            {
                var sqlPorId = @"
                    SELECT TOP 1 Id, COALESCE(NULLIF(LTRIM(RTRIM(Nombre)), ''), Nombre_Usuario, CAST(Id AS NVARCHAR(50)))
                    FROM dbo.Usuarios
                    WHERE Id = @Id;";

                using var cmdId = new SqlCommand(sqlPorId, conn);
                cmdId.Parameters.AddWithValue("@Id", idDirecto);
                using var readerId = cmdId.ExecuteReader();
                if (readerId.Read())
                    return (Convert.ToInt32(readerId[0]), readerId[1]?.ToString() ?? limpio);
            }

            var sqlExacta = @"
                SELECT TOP 1 Id, COALESCE(NULLIF(LTRIM(RTRIM(Nombre)), ''), Nombre_Usuario)
                FROM dbo.Usuarios
                WHERE LOWER(LTRIM(RTRIM(Nombre))) = LOWER(@Nombre)
                   OR LOWER(LTRIM(RTRIM(ISNULL(Nombre_Usuario, '')))) = LOWER(@Nombre)
                ORDER BY Id ASC;";

            using (var cmdExacta = new SqlCommand(sqlExacta, conn))
            {
                cmdExacta.Parameters.AddWithValue("@Nombre", limpio);
                using var readerExacta = cmdExacta.ExecuteReader();
                if (readerExacta.Read())
                    return (Convert.ToInt32(readerExacta[0]), readerExacta[1]?.ToString() ?? limpio);
            }

            var sqlParcial = @"
                SELECT TOP 1 Id, COALESCE(NULLIF(LTRIM(RTRIM(Nombre)), ''), Nombre_Usuario)
                FROM dbo.Usuarios
                WHERE LOWER(Nombre) LIKE '%' + LOWER(@Nombre) + '%'
                   OR LOWER(ISNULL(Nombre_Usuario, '')) LIKE '%' + LOWER(@Nombre) + '%'
                ORDER BY Id ASC;";

            using (var cmdParcial = new SqlCommand(sqlParcial, conn))
            {
                cmdParcial.Parameters.AddWithValue("@Nombre", limpio);
                using var readerParcial = cmdParcial.ExecuteReader();
                if (readerParcial.Read())
                    return (Convert.ToInt32(readerParcial[0]), readerParcial[1]?.ToString() ?? limpio);
            }

            throw new KeyNotFoundException($"No se encontró el usuario '{limpio}' en dbo.Usuarios.");
        }

        private static (int Id, string NombreReal) ResolverGatoPorNombre(SqlConnection conn, string gatoTexto)
        {
            var limpio = (gatoTexto ?? "").Trim();

            if (int.TryParse(limpio, out var idDirecto))
            {
                var sqlPorId = @"
                    SELECT TOP 1 Id, Nombre
                    FROM dbo.Gatos
                    WHERE Id = @Id;";

                using var cmdId = new SqlCommand(sqlPorId, conn);
                cmdId.Parameters.AddWithValue("@Id", idDirecto);
                using var readerId = cmdId.ExecuteReader();
                if (readerId.Read())
                    return (Convert.ToInt32(readerId[0]), readerId[1]?.ToString() ?? limpio);
            }

            var sqlBuscar = @"
                SELECT TOP 1 Id, Nombre
                FROM dbo.Gatos
                WHERE LOWER(LTRIM(RTRIM(Nombre))) = LOWER(@Nombre)
                ORDER BY Id ASC;";

            using (var cmd = new SqlCommand(sqlBuscar, conn))
            {
                cmd.Parameters.AddWithValue("@Nombre", limpio);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                    return (Convert.ToInt32(reader[0]), reader[1]?.ToString() ?? limpio);
            }

            var sqlInsertarGato = @"
                INSERT INTO dbo.Gatos (Nombre, Estado)
                OUTPUT INSERTED.Id, INSERTED.Nombre
                VALUES (@Nombre, N'Disponible');";

            using (var cmdIns = new SqlCommand(sqlInsertarGato, conn))
            {
                cmdIns.Parameters.AddWithValue("@Nombre", limpio);
                using var readerIns = cmdIns.ExecuteReader();
                if (readerIns.Read())
                    return (Convert.ToInt32(readerIns[0]), readerIns[1]?.ToString() ?? limpio);
            }

            throw new InvalidOperationException($"No se pudo resolver el gato '{limpio}'.");
        }

        [HttpGet]
        public IActionResult Listar()
        {
            var lista = new List<Solicitud>();
            using var conn = new SqlConnection(ConnectionString);
            conn.Open();

            var sql = @"
                SELECT
                    s.Id,
                    COALESCE(NULLIF(LTRIM(RTRIM(u.Nombre)), ''), u.Nombre_Usuario, CAST(s.UsuarioId AS NVARCHAR(50))) AS UsuarioNombre,
                    COALESCE(NULLIF(LTRIM(RTRIM(g.Nombre)), ''), CAST(s.id_gato AS NVARCHAR(50))) AS GatoNombre,
                    s.Fecha,
                    s.Estado
                FROM dbo.Solicitudes s
                LEFT JOIN dbo.Usuarios u ON s.UsuarioId = u.Id
                LEFT JOIN dbo.Gatos g ON s.id_gato = g.Id
                ORDER BY s.Id ASC;";

            using var cmd = new SqlCommand(sql, conn);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                lista.Add(new Solicitud
                {
                    id = Convert.ToInt32(reader["Id"]),
                    usuario = reader["UsuarioNombre"] == DBNull.Value ? "" : reader["UsuarioNombre"].ToString()!,
                    gato = reader["GatoNombre"] == DBNull.Value ? "" : reader["GatoNombre"].ToString()!,
                    fecha = reader["Fecha"] == DBNull.Value
                        ? ""
                        : Convert.ToDateTime(reader["Fecha"]).ToString("yyyy-MM-dd"),
                    estado = reader["Estado"] == DBNull.Value || string.IsNullOrWhiteSpace(reader["Estado"].ToString())
                        ? "Pendiente"
                        : reader["Estado"].ToString()!
                });
            }

            return Ok(lista);
        }

        [HttpPost]
        public IActionResult Crear([FromBody] Solicitud s)
        {
            string usuarioTexto = (s.usuario ?? "").Trim();
            string gatoTexto = (s.gato ?? "").Trim();
            string estado = string.IsNullOrWhiteSpace(s.estado) ? "Pendiente" : s.estado.Trim();

            if (string.IsNullOrWhiteSpace(usuarioTexto) || string.IsNullOrWhiteSpace(gatoTexto))
                return BadRequest(new { mensaje = "Debes ingresar el usuario y seleccionar un gato." });

            DateTime fecha = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(s.fecha) && DateTime.TryParse(s.fecha, out var parsedFecha))
                fecha = parsedFecha.Date;

            using var conn = new SqlConnection(ConnectionString);
            conn.Open();

            try
            {
                var (usuarioId, usuarioNombreReal) = ResolverUsuario(conn, usuarioTexto);
                var (gatoId, gatoNombreReal) = ResolverGatoPorNombre(conn, gatoTexto);

                var sql = @"
                    INSERT INTO dbo.Solicitudes (UsuarioId, id_gato, Fecha, Estado)
                    VALUES (@UsuarioId, @GatoId, @Fecha, @Estado);
                    SELECT CAST(SCOPE_IDENTITY() AS INT);";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@UsuarioId", usuarioId);
                cmd.Parameters.AddWithValue("@GatoId", gatoId);
                cmd.Parameters.AddWithValue("@Fecha", fecha);
                cmd.Parameters.AddWithValue("@Estado", estado);

                s.id = Convert.ToInt32(cmd.ExecuteScalar());
                s.usuario = usuarioNombreReal;
                s.gato = gatoNombreReal;
                s.fecha = fecha.ToString("yyyy-MM-dd");
                s.estado = estado;
                return Ok(s);
            }
            catch (KeyNotFoundException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
            {
                return BadRequest(new { mensaje = "Ya existe una solicitud con ese valor único en dbo.Solicitudes." });
            }
            catch (SqlException ex)
            {
                return BadRequest(new { mensaje = "Error de base de datos al guardar la solicitud: " + ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public IActionResult Actualizar(int id, [FromBody] Solicitud s)
        {
            string usuarioTexto = (s.usuario ?? "").Trim();
            string gatoTexto = (s.gato ?? "").Trim();
            string estado = string.IsNullOrWhiteSpace(s.estado) ? "Pendiente" : s.estado.Trim();

            if (string.IsNullOrWhiteSpace(usuarioTexto) || string.IsNullOrWhiteSpace(gatoTexto))
                return BadRequest(new { mensaje = "Debes ingresar el usuario y seleccionar un gato." });

            DateTime fecha = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(s.fecha) && DateTime.TryParse(s.fecha, out var parsedFecha))
                fecha = parsedFecha.Date;

            using var conn = new SqlConnection(ConnectionString);
            conn.Open();

            try
            {
                var (usuarioId, usuarioNombreReal) = ResolverUsuario(conn, usuarioTexto);
                var (gatoId, gatoNombreReal) = ResolverGatoPorNombre(conn, gatoTexto);

                var sql = @"
                    UPDATE dbo.Solicitudes
                    SET
                        UsuarioId = @UsuarioId,
                        id_gato = @GatoId,
                        Fecha = @Fecha,
                        Estado = @Estado
                    WHERE Id = @Id;";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.Parameters.AddWithValue("@UsuarioId", usuarioId);
                cmd.Parameters.AddWithValue("@GatoId", gatoId);
                cmd.Parameters.AddWithValue("@Fecha", fecha);
                cmd.Parameters.AddWithValue("@Estado", estado);

                var filas = cmd.ExecuteNonQuery();
                if (filas == 0)
                    return NotFound(new { mensaje = "Solicitud no encontrada." });

                s.id = id;
                s.usuario = usuarioNombreReal;
                s.gato = gatoNombreReal;
                s.fecha = fecha.ToString("yyyy-MM-dd");
                s.estado = estado;
                return Ok(s);
            }
            catch (KeyNotFoundException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
            catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
            {
                return BadRequest(new { mensaje = "Ya existe una solicitud con ese valor único en dbo.Solicitudes." });
            }
            catch (SqlException ex)
            {
                return BadRequest(new { mensaje = "Error de base de datos al actualizar la solicitud: " + ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public IActionResult Eliminar(int id)
        {
            using var conn = new SqlConnection(ConnectionString);
            conn.Open();

            var sql = "DELETE FROM dbo.Solicitudes WHERE Id = @Id;";
            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Id", id);

            var filas = cmd.ExecuteNonQuery();
            if (filas == 0)
                return NotFound(new { mensaje = "Solicitud no encontrada." });

            return Ok(new { mensaje = "Solicitud eliminada con éxito." });
        }
    }
}