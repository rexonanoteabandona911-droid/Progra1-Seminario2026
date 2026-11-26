using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Cryptography;
using Mishi_App_para_web.Models;

[ApiController]
[Route("api/usuarios")]
public class UsuariosController : ControllerBase
{
    private readonly string cs;

    public UsuariosController(IConfiguration config)
    {
        cs = config.GetConnectionString("MishiApi") ?? "Server=kimby-pc\\sqlexpress;Database=MishiApi;Trusted_Connection=True;TrustServerCertificate=True";
    }

    public class UsuarioRegistroDto
    {
        public string? nombre { get; set; }
        public string? correo { get; set; }
        public string? telefono { get; set; }
        public string? clave { get; set; }
        public string? rol { get; set; }
    }

    public class LoginDto
    {
        public string? correo { get; set; }
        public string? clave { get; set; }
    }

    public class PerfilDto
    {
        public string? nombre { get; set; }
        public string? correo { get; set; }
        public string? telefono { get; set; }
        public string? claveActual { get; set; }
        public string? claveNueva { get; set; }
    }
    public class UsuarioAdminDto
    {
        public int Id { get; set; }
        public string? Nombre { get; set; }
        public string? Correo { get; set; }
        public string? Telefono { get; set; }
        public string? Rol { get; set; }
        public string? Clave { get; set; }   
    }

    static string Hash(string clave)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(clave, salt, 100000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(salt) + "." + Convert.ToBase64String(hash);
    }
    static bool Verificar(string clave, string? guardado)
    {
        if (string.IsNullOrEmpty(guardado)) return false;
        try
        {
            var p = guardado.Split('.');
            if (p.Length != 2) return false;
            byte[] salt = Convert.FromBase64String(p[0]);
            byte[] esperado = Convert.FromBase64String(p[1]);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(clave, salt, 100000, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(hash, esperado);
        }
        catch (FormatException) { return false; }
    }

    [HttpGet]
    public async Task<IActionResult> ObtenerUsuarios()
    {
        using var con = new SqlConnection(cs);
        await con.OpenAsync();
        using var cmd = new SqlCommand("SELECT Id, Nombre, Correo, Telefono, Rol FROM Usuarios", con);
        using var r = await cmd.ExecuteReaderAsync();

        var lista = new List<object>();
        while (await r.ReadAsync())
        {
            lista.Add(new
            {
                id = r.GetInt32(0),
                nombre = r.IsDBNull(1) ? "" : r.GetString(1),
                correo = r.IsDBNull(2) ? "" : r.GetString(2),
                telefono = r.IsDBNull(3) ? "" : r.GetString(3),
                rol = r.IsDBNull(4) ? "Adoptante" : r.GetString(4)
            });
        }
        return Ok(lista);
    }

    [HttpGet("perfil")]
    public IActionResult ObtenerPerfil()
    {
        return Ok(new { mensaje = "Ruta de perfil activa" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto d)
    {
        if (string.IsNullOrWhiteSpace(d.correo) || string.IsNullOrEmpty(d.clave))
            return BadRequest(new { mensaje = "Escribe tu correo y tu contraseña" });
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using var cmd = new SqlCommand("SELECT Id, Nombre, ClaveHash, Rol FROM Usuarios WHERE Correo = @c", con);
            cmd.Parameters.AddWithValue("@c", d.correo.Trim());
            using var r = await cmd.ExecuteReaderAsync();

            if (await r.ReadAsync())
            {
                string? guardado = r.IsDBNull(2) ? null : r.GetString(2);
                if (Verificar(d.clave, guardado))
                {
                    return Ok(new
                    {
                        id = r.GetInt32(0),
                        nombre = r.IsDBNull(1) ? "" : r.GetString(1),
                        correo = d.correo.Trim(),
                        rol = r.IsDBNull(3) ? "Adoptante" : r.GetString(3)
                    });
                }
            }
            return Unauthorized(new { mensaje = "Correo o contraseña incorrectos" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "No se pudo iniciar sesión: " + ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerPorId(int id)
    {
        using var con = new SqlConnection(cs);
        await con.OpenAsync();
        using var cmd = new SqlCommand(
            "SELECT Id, Nombre, Correo, Telefono, Rol FROM Usuarios WHERE Id = @id", con);
        cmd.Parameters.AddWithValue("@id", id);
        using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return NotFound(new { mensaje = "Usuario no encontrado" });

        return Ok(new
        {
            id = r.GetInt32(0),
            nombre = r.IsDBNull(1) ? "" : r.GetString(1),
            correo = r.IsDBNull(2) ? "" : r.GetString(2),
            telefono = r.IsDBNull(3) ? "" : r.GetString(3),
            rol = r.IsDBNull(4) ? "Adoptante" : r.GetString(4)
        });
    }

    [HttpPut("{id:int}/perfil")]
    public async Task<IActionResult> ActualizarPerfil(int id, [FromBody] PerfilDto d)
    {
        if (string.IsNullOrWhiteSpace(d.nombre) || string.IsNullOrWhiteSpace(d.correo))
            return BadRequest(new { mensaje = "Nombre y correo son obligatorios" });
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using (var dup = new SqlCommand(
                "SELECT COUNT(*) FROM Usuarios WHERE Correo = @c AND Id <> @id", con))
            {
                dup.Parameters.AddWithValue("@c", d.correo.Trim());
                dup.Parameters.AddWithValue("@id", id);
                if (Convert.ToInt32(await dup.ExecuteScalarAsync()) > 0)
                    return Conflict(new { mensaje = "Ese correo ya está en uso" });
            }

            string? nuevoHash = null;
            if (!string.IsNullOrWhiteSpace(d.claveNueva))
            {
                using var q = new SqlCommand("SELECT ClaveHash FROM Usuarios WHERE Id = @id", con);
                q.Parameters.AddWithValue("@id", id);
                var actual = await q.ExecuteScalarAsync() as string;
                if (actual == null)
                    return NotFound(new { mensaje = "Usuario no encontrado" });
                if (string.IsNullOrWhiteSpace(d.claveActual) || !Verificar(d.claveActual, actual))
                    return BadRequest(new { mensaje = "La contraseña actual es incorrecta" });
                nuevoHash = Hash(d.claveNueva);
            }

            var sql = "UPDATE Usuarios SET Nombre=@n, Correo=@c, Telefono=@t"
                    + (nuevoHash != null ? ", ClaveHash=@h" : "")
                    + " WHERE Id=@id";
            using var cmd = new SqlCommand(sql, con);
            cmd.Parameters.AddWithValue("@n", d.nombre.Trim());
            cmd.Parameters.AddWithValue("@c", d.correo.Trim());
            cmd.Parameters.AddWithValue("@t", string.IsNullOrWhiteSpace(d.telefono) ? DBNull.Value : d.telefono.Trim());
            if (nuevoHash != null) cmd.Parameters.AddWithValue("@h", nuevoHash);
            cmd.Parameters.AddWithValue("@id", id);

            if (await cmd.ExecuteNonQueryAsync() == 0)
                return NotFound(new { mensaje = "Usuario no encontrado" });

            return Ok(new { mensaje = "Perfil actualizado" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "No se pudo guardar el perfil: " + ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] UsuarioRegistroDto d)
    {
        if (string.IsNullOrWhiteSpace(d.nombre) || string.IsNullOrWhiteSpace(d.correo) || string.IsNullOrWhiteSpace(d.clave))
            return BadRequest(new { mensaje = "Completa nombre, correo y contraseña" });
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using (var existe = new SqlCommand("SELECT COUNT(*) FROM Usuarios WHERE Correo = @c", con))
            {
                existe.Parameters.AddWithValue("@c", d.correo.Trim());
                int count = Convert.ToInt32(await existe.ExecuteScalarAsync());
                if (count > 0)
                    return Conflict(new { mensaje = "Ese correo ya está registrado" });
            }

            using var cmd = new SqlCommand(
                "INSERT INTO Usuarios (Nombre, Correo, Telefono, ClaveHash, Rol) VALUES (@n, @c, @t, @h, @r)", con);
            cmd.Parameters.AddWithValue("@n", d.nombre.Trim());
            cmd.Parameters.AddWithValue("@c", d.correo.Trim());
            cmd.Parameters.AddWithValue("@t", string.IsNullOrWhiteSpace(d.telefono) ? DBNull.Value : d.telefono.Trim());
            cmd.Parameters.AddWithValue("@h", Hash(d.clave));
            cmd.Parameters.AddWithValue("@r", string.IsNullOrWhiteSpace(d.rol) ? "Adoptante" : d.rol.Trim());
            await cmd.ExecuteNonQueryAsync();

            return Ok(new { mensaje = "Cuenta creada" });
        }
        catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
        {
            return Conflict(new { mensaje = "Ese correo o nombre de usuario ya está registrado" });
        }
        catch (SqlException ex) when (ex.Number == 515)
        {
            return BadRequest(new { mensaje = "La tabla Usuarios exige un dato que no se envió: " + ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "No se pudo crear la cuenta: " + ex.Message });
        }
    }
    [HttpPut]
    [HttpPut("{id}")]
    public async Task<IActionResult> Actualizar(int? id, [FromBody] UsuarioAdminDto d)
    {
        if (id.HasValue && id.Value > 0)
        {
            d.Id = id.Value;
        }

        if (d.Id <= 0 || string.IsNullOrWhiteSpace(d.Nombre) || string.IsNullOrWhiteSpace(d.Correo))
            return BadRequest(new { mensaje = "El ID, nombre y correo son obligatorios" });

        bool cambiaClave = !string.IsNullOrEmpty(d.Clave);
        if (cambiaClave && d.Clave!.Length < 4)
            return BadRequest(new { mensaje = "La contraseña debe tener al menos 4 caracteres" });

        string rol = string.Equals((d.Rol ?? "").Trim(), "Administrador", StringComparison.OrdinalIgnoreCase)
            ? "Administrador" : "Adoptante";

        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();

            using (var dup = new SqlCommand(
                "SELECT COUNT(*) FROM Usuarios WHERE Correo = @c AND Id <> @id", con))
            {
                dup.Parameters.AddWithValue("@c", d.Correo.Trim());
                dup.Parameters.AddWithValue("@id", d.Id);
                if (Convert.ToInt32(await dup.ExecuteScalarAsync()) > 0)
                    return Conflict(new { mensaje = "Ya existe otro usuario con ese correo" });
            }

            var sql = "UPDATE Usuarios SET Nombre = @n, Correo = @c, Telefono = @t, Rol = @r"
                    + (cambiaClave ? ", ClaveHash = @h" : "")
                    + " WHERE Id = @id";
            using var cmd = new SqlCommand(sql, con);
            cmd.Parameters.AddWithValue("@n", d.Nombre.Trim());
            cmd.Parameters.AddWithValue("@c", d.Correo.Trim());
            cmd.Parameters.AddWithValue("@t", string.IsNullOrWhiteSpace(d.Telefono) ? DBNull.Value : d.Telefono.Trim());
            cmd.Parameters.AddWithValue("@r", rol);
            if (cambiaClave) cmd.Parameters.AddWithValue("@h", Hash(d.Clave!));
            cmd.Parameters.AddWithValue("@id", d.Id);

            int filasAfectadas = await cmd.ExecuteNonQueryAsync();
            if (filasAfectadas == 0)
                return NotFound(new { mensaje = "No se encontró el usuario a actualizar" });

            return Ok(new { mensaje = "Usuario actualizado correctamente" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "No se pudo actualizar el usuario: " + ex.Message });
        }
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        try
        {
            using var con = new SqlConnection(cs);
            await con.OpenAsync();
            using var tx = con.BeginTransaction();
            try
            {
                using (var cmdAdoptantes = new SqlCommand("DELETE FROM Adoptantes WHERE id_usuario = @id", con, tx))
                {
                    cmdAdoptantes.Parameters.AddWithValue("@id", id);
                    await cmdAdoptantes.ExecuteNonQueryAsync();
                }

                int filasAfectadas;
                using (var cmd = new SqlCommand("DELETE FROM Usuarios WHERE Id = @id", con, tx))
                {
                    cmd.Parameters.AddWithValue("@id", id);
                    filasAfectadas = await cmd.ExecuteNonQueryAsync();
                }

                if (filasAfectadas == 0)
                {
                    tx.Rollback();
                    return NotFound(new { mensaje = "No se encontró el usuario a eliminar" });
                }

                tx.Commit();
                return Ok(new { mensaje = "Usuario eliminado correctamente" });
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }
        catch (SqlException ex) when (ex.Number == 547)
        {
            return Conflict(new { mensaje = "No se puede eliminar: el usuario tiene registros relacionados (solicitudes, reportes, etc.)." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensaje = "No se pudo eliminar el usuario: " + ex.Message });
        }
    }
}