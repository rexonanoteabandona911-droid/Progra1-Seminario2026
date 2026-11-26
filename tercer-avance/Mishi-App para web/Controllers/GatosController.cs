using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mishi_App_para_web.Models;

namespace Mishi_App_para_web.Controllers
{
    [ApiController]
    [Route("api/gatos")]
    public class GatosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GatosController(AppDbContext context)
        {
            _context = context;
        }

        public class GatoRequest
        {
            public int Id { get; set; }
            public string? Nombre { get; set; }
            public string? Estado { get; set; }
            public JsonElement? Raza { get; set; }
            public JsonElement? IdRaza { get; set; }
            public int? IdReporte { get; set; }
            public DateTime? FechaNacimiento { get; set; }
            public int? Edad { get; set; }
            public string? Sexo { get; set; }
        }

        private static readonly HashSet<string> EstadosValidos = new(StringComparer.OrdinalIgnoreCase)
        {
            "Disponible",
            "En proceso",
            "Adoptado",
            "En tratamiento"
        };

        private static string NormalizarEstado(string? estado)
        {
            if (string.IsNullOrWhiteSpace(estado))
                return "Disponible";

            var limpio = estado.Trim();
            foreach (var valido in EstadosValidos)
            {
                if (string.Equals(valido, limpio, StringComparison.OrdinalIgnoreCase))
                    return valido;
            }

            return "Disponible";
        }

        private static string? NormalizarSexo(string? sexo)
        {
            if (string.IsNullOrWhiteSpace(sexo))
                return null;

            var limpio = sexo.Trim().ToUpperInvariant();
            if (limpio == "H" || limpio == "HEMBRA" || limpio == "F" || limpio == "FEMENINO")
                return "H";
            if (limpio == "M" || limpio == "MACHO" || limpio == "MASCULINO")
                return "M";

            return null;
        }

        private static string? FormatearSexoSalida(string? sexo)
        {
            if (string.IsNullOrWhiteSpace(sexo))
                return null;

            var limpio = sexo.Trim().ToUpperInvariant();
            if (limpio == "H") return "Hembra";
            if (limpio == "M") return "Macho";

            return sexo.Trim();
        }

        private static DateTime? ResolverFechaNacimiento(DateTime? fechaNacimiento, int? edad)
        {
            if (fechaNacimiento.HasValue)
            {
                return fechaNacimiento.Value.Date;
            }

            if (edad.HasValue && edad.Value >= 0)
            {
                return DateTime.Today.AddYears(-edad.Value);
            }

            return null;
        }

        private static string? ExtraerTextoRaza(GatoRequest req)
        {
            foreach (var elem in new[] { req.Raza, req.IdRaza })
            {
                if (!elem.HasValue) continue;
                var val = elem.Value;

                if (val.ValueKind == JsonValueKind.Number && val.TryGetInt32(out int num))
                    return num.ToString(CultureInfo.InvariantCulture);

                if (val.ValueKind == JsonValueKind.String)
                {
                    var s = val.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                        return s.Trim();
                }
            }

            return null;
        }

        private static string QuitarTildes(string texto)
        {
            var normalizado = texto.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(normalizado.Length);
            foreach (var c in normalizado)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            return sb.ToString();
        }

        private async Task<(int? idRaza, string nombreRaza)> ResolverRazaAsync(GatoRequest req, int? idRazaActual = null)
        {
            var entrada = ExtraerTextoRaza(req);

            if (string.IsNullOrWhiteSpace(entrada))
            {
                if (idRazaActual.HasValue && idRazaActual.Value > 0)
                {
                    var actualNombre = await ObtenerNombreRazaAsync(idRazaActual.Value);
                    return (idRazaActual.Value, actualNombre ?? "No especificada");
                }
                return (null, "No especificada");
            }

            var con = _context.Database.GetDbConnection();
            if (con.State != System.Data.ConnectionState.Open)
                await con.OpenAsync();

            if (int.TryParse(entrada, out int idBuscado) && idBuscado > 0)
            {
                using var cmdId = con.CreateCommand();
                cmdId.CommandText = "SELECT TOP 1 id_raza, Nombre FROM dbo.Raza WHERE id_raza = @id";
                var p = cmdId.CreateParameter();
                p.ParameterName = "@id";
                p.Value = idBuscado;
                cmdId.Parameters.Add(p);

                using var reader = await cmdId.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    int idR = Convert.ToInt32(reader.GetValue(0));
                    string nomR = reader.IsDBNull(1) ? "No especificada" : (Convert.ToString(reader.GetValue(1)) ?? "No especificada");
                    return (idR, nomR.Trim());
                }
            }

            var entradaSinTildes = QuitarTildes(entrada);
            using (var cmdAll = con.CreateCommand())
            {
                cmdAll.CommandText = "SELECT id_raza, Nombre FROM dbo.Raza";
                using var reader = await cmdAll.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    if (reader.IsDBNull(0)) continue;
                    int idR = Convert.ToInt32(reader.GetValue(0));
                    string nomR = reader.IsDBNull(1) ? "" : (Convert.ToString(reader.GetValue(1)) ?? "");
                    if (string.Equals(nomR.Trim(), entrada, StringComparison.OrdinalIgnoreCase) ||
                        QuitarTildes(nomR) == entradaSinTildes)
                    {
                        return (idR, nomR.Trim());
                    }
                }
            }

            var nombreFormateado = CultureInfo.CurrentCulture.TextInfo.ToTitleCase(entrada.ToLowerInvariant());
            using var cmdInsert = con.CreateCommand();
            cmdInsert.CommandText = @"
                INSERT INTO dbo.Raza (Nombre, Descripcion)
                VALUES (@nombre, NULL);
                SELECT CAST(SCOPE_IDENTITY() AS INT);";
            var pNom = cmdInsert.CreateParameter();
            pNom.ParameterName = "@nombre";
            pNom.Value = nombreFormateado;
            cmdInsert.Parameters.Add(pNom);

            var nuevoIdObj = await cmdInsert.ExecuteScalarAsync();
            int nuevoId = Convert.ToInt32(nuevoIdObj);
            return (nuevoId, nombreFormateado);
        }

        private async Task<string?> ObtenerNombreRazaAsync(int? idRaza)
        {
            if (!idRaza.HasValue || idRaza.Value <= 0)
                return null;

            var con = _context.Database.GetDbConnection();
            if (con.State != System.Data.ConnectionState.Open)
                await con.OpenAsync();

            using var cmd = con.CreateCommand();
            cmd.CommandText = "SELECT TOP 1 Nombre FROM dbo.Raza WHERE id_raza = @id";
            var p = cmd.CreateParameter();
            p.ParameterName = "@id";
            p.Value = idRaza.Value;
            cmd.Parameters.Add(p);

            var res = await cmd.ExecuteScalarAsync();
            return res == null || res == DBNull.Value ? null : res.ToString()?.Trim();
        }

        private async Task<Dictionary<int, string>> ObtenerDiccionarioRazasAsync()
        {
            var dict = new Dictionary<int, string>();
            var con = _context.Database.GetDbConnection();
            if (con.State != System.Data.ConnectionState.Open)
                await con.OpenAsync();

            using var cmd = con.CreateCommand();
            cmd.CommandText = "SELECT id_raza, Nombre FROM dbo.Raza";
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                if (!reader.IsDBNull(0))
                {
                    int idR = Convert.ToInt32(reader.GetValue(0));
                    string nomR = reader.IsDBNull(1) ? "No especificada" : (Convert.ToString(reader.GetValue(1)) ?? "No especificada");
                    dict[idR] = nomR.Trim();
                }
            }
            return dict;
        }

        private async Task<int?> ValidarIdReporteAsync(int? idReporte)
        {
            if (!idReporte.HasValue || idReporte.Value <= 0)
                return null;

            var existe = await _context.Reportes_Calle
                .AnyAsync(r => r.IdReporte == idReporte.Value);

            return existe ? idReporte.Value : null;
        }

        // GET: api/gatos/razas
        [HttpGet("razas")]
        public async Task<ActionResult<IEnumerable<object>>> ListarRazas()
        {
            var razas = new List<object>();
            var con = _context.Database.GetDbConnection();
            if (con.State != System.Data.ConnectionState.Open)
                await con.OpenAsync();

            using var cmd = con.CreateCommand();
            cmd.CommandText = "SELECT id_raza, Nombre FROM dbo.Raza ORDER BY id_raza;";
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                if (!reader.IsDBNull(0))
                {
                    int idVal = Convert.ToInt32(reader.GetValue(0));
                    string nomVal = reader.IsDBNull(1) ? "" : (Convert.ToString(reader.GetValue(1)) ?? "");
                    if (!string.IsNullOrWhiteSpace(nomVal))
                    {
                        razas.Add(new
                        {
                            id = idVal,
                            idRaza = idVal,
                            nombre = nomVal.Trim()
                        });
                    }
                }
            }

            return Ok(razas);
        }

        // GET: api/gatos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> Listar()
        {
            var gatos = await _context.Gatos
                .OrderBy(g => g.Id)
                .ToListAsync();

            var razas = await ObtenerDiccionarioRazasAsync();

            var resultado = gatos.Select(g =>
            {
                string nombreRaza = "No especificada";
                if (g.IdRaza.HasValue && razas.TryGetValue(g.IdRaza.Value, out var nom))
                {
                    nombreRaza = string.IsNullOrWhiteSpace(nom) ? "No especificada" : nom;
                }

                return new
                {
                    id = g.Id,
                    nombre = g.Nombre,
                    estado = NormalizarEstado(g.Estado),
                    idRaza = g.IdRaza,
                    raza = nombreRaza,
                    nombreRaza = nombreRaza,
                    idReporte = g.IdReporte,
                    fechaNacimiento = g.FechaNacimiento,
                    edad = g.Edad,
                    sexo = FormatearSexoSalida(g.Sexo)
                };
            });

            return Ok(resultado);
        }

        // GET: api/gatos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> ObtenerPorId(int id)
        {
            var gato = await _context.Gatos.FindAsync(id);
            if (gato == null)
            {
                return NotFound(new { mensaje = $"No se encontró el gatito con ID {id}." });
            }

            var nombreRaza = await ObtenerNombreRazaAsync(gato.IdRaza) ?? "No especificada";

            return Ok(new
            {
                id = gato.Id,
                nombre = gato.Nombre,
                estado = NormalizarEstado(gato.Estado),
                idRaza = gato.IdRaza,
                raza = nombreRaza,
                nombreRaza = nombreRaza,
                idReporte = gato.IdReporte,
                fechaNacimiento = gato.FechaNacimiento,
                edad = gato.Edad,
                sexo = FormatearSexoSalida(gato.Sexo)
            });
        }

        // POST: api/gatos
        [HttpPost]
        public async Task<ActionResult<object>> Crear([FromBody] GatoRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Nombre))
            {
                return BadRequest(new { mensaje = "El nombre del gatito es obligatorio." });
            }

            var (idRazaValido, nombreRaza) = await ResolverRazaAsync(req);
            var idReporteValido = await ValidarIdReporteAsync(req.IdReporte);

            var nuevoGato = new Gato
            {
                Nombre = req.Nombre.Trim(),
                Estado = NormalizarEstado(req.Estado),
                IdRaza = idRazaValido,
                IdReporte = idReporteValido,
                FechaNacimiento = ResolverFechaNacimiento(req.FechaNacimiento, req.Edad),
                Sexo = NormalizarSexo(req.Sexo)
            };

            try
            {
                _context.Gatos.Add(nuevoGato);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var detalle = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { mensaje = $"No se pudo guardar en la base de datos: {detalle}" });
            }

            return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevoGato.Id }, new
            {
                id = nuevoGato.Id,
                nombre = nuevoGato.Nombre,
                estado = nuevoGato.Estado,
                idRaza = nuevoGato.IdRaza,
                raza = nombreRaza,
                nombreRaza = nombreRaza,
                idReporte = nuevoGato.IdReporte,
                fechaNacimiento = nuevoGato.FechaNacimiento,
                edad = nuevoGato.Edad,
                sexo = FormatearSexoSalida(nuevoGato.Sexo)
            });
        }

        // PUT: api/gatos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Actualizar(int id, [FromBody] GatoRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Nombre))
            {
                return BadRequest(new { mensaje = "El nombre del gatito es obligatorio." });
            }

            var gatoExistente = await _context.Gatos.FindAsync(id);
            if (gatoExistente == null)
            {
                return NotFound(new { mensaje = "Gatito no encontrado." });
            }

            var (idRazaValido, nombreRaza) = await ResolverRazaAsync(req, gatoExistente.IdRaza);
            var idReporteValido = req.IdReporte.HasValue
                ? await ValidarIdReporteAsync(req.IdReporte)
                : gatoExistente.IdReporte;

            gatoExistente.Nombre = req.Nombre.Trim();
            gatoExistente.Estado = NormalizarEstado(req.Estado);
            gatoExistente.IdRaza = idRazaValido;
            gatoExistente.IdReporte = idReporteValido;
            gatoExistente.FechaNacimiento = ResolverFechaNacimiento(req.FechaNacimiento, req.Edad);
            gatoExistente.Sexo = NormalizarSexo(req.Sexo);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var detalle = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { mensaje = $"No se pudo actualizar en la base de datos: {detalle}" });
            }

            return Ok(new
            {
                id = gatoExistente.Id,
                nombre = gatoExistente.Nombre,
                estado = gatoExistente.Estado,
                idRaza = gatoExistente.IdRaza,
                raza = nombreRaza,
                nombreRaza = nombreRaza,
                idReporte = gatoExistente.IdReporte,
                fechaNacimiento = gatoExistente.FechaNacimiento,
                edad = gatoExistente.Edad,
                sexo = FormatearSexoSalida(gatoExistente.Sexo)
            });
        }

        // DELETE: api/gatos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Eliminar(int id)
        {
            var gatoExistente = await _context.Gatos.FindAsync(id);
            if (gatoExistente == null)
            {
                return NotFound(new { mensaje = "Gatito no encontrado." });
            }

            try
            {
                _context.Gatos.Remove(gatoExistente);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var detalle = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { mensaje = $"No se pudo eliminar el registro: {detalle}" });
            }

            return Ok(new { mensaje = "Gatito eliminado con éxito." });
        }
    }
}