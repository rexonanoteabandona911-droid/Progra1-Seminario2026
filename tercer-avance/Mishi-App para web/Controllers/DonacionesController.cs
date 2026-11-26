using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mishi_App_para_web;
using Mishi_App_para_web.Models;

namespace Mishi_App_para_web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DonacionesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DonacionesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Donacion>>> GetDonaciones()
        {
            var donaciones = await _context.Donaciones
                .AsNoTracking()
                .OrderBy(d => d.Id)
                .ToListAsync();

            return Ok(donaciones);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Donacion>> GetDonacion(int id)
        {
            var donacion = await _context.Donaciones.FindAsync(id);
            if (donacion == null)
            {
                return NotFound(new { message = "No se encontró la donación." });
            }

            return Ok(donacion);
        }

        [HttpPost]
        public async Task<ActionResult<Donacion>> PostDonacion([FromBody] Donacion donacion)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrWhiteSpace(donacion.TipoInsumo))
            {
                return BadRequest(new { message = "Debes ingresar el tipo de insumo." });
            }

            if (donacion.Cantidad <= 0)
            {
                return BadRequest(new { message = "La cantidad debe ser mayor que cero." });
            }

            donacion.Id = 0;
            donacion.TipoInsumo = donacion.TipoInsumo.Trim();
            donacion.Observaciones = string.IsNullOrWhiteSpace(donacion.Observaciones)
                ? null
                : donacion.Observaciones.Trim();

            _context.Donaciones.Add(donacion);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDonacion), new { id = donacion.Id }, donacion);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> PutDonacion(int id, [FromBody] Donacion datos)
        {
            if (id != datos.Id)
            {
                return BadRequest(new { message = "El ID de la ruta no coincide con el registro." });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var donacion = await _context.Donaciones.FindAsync(id);
            if (donacion == null)
            {
                return NotFound(new { message = "No se encontró la donación." });
            }

            if (string.IsNullOrWhiteSpace(datos.TipoInsumo))
            {
                return BadRequest(new { message = "Debes ingresar el tipo de insumo." });
            }

            donacion.UsuarioId = datos.UsuarioId;
            donacion.TipoInsumo = datos.TipoInsumo.Trim();
            donacion.Cantidad = datos.Cantidad;
            donacion.FechaDonacion = datos.FechaDonacion;
            donacion.Observaciones = string.IsNullOrWhiteSpace(datos.Observaciones)
                ? null
                : datos.Observaciones.Trim();

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteDonacion(int id)
        {
            var donacion = await _context.Donaciones.FindAsync(id);
            if (donacion == null)
            {
                return NotFound(new { message = "No se encontró la donación." });
            }

            _context.Donaciones.Remove(donacion);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}