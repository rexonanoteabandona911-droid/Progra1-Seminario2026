using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webapp.Models;

[Route("api/[controller]")]
[ApiController]
public class DocentesController : ControllerBase
{
    private readonly MyDbContext _context;
    public DocentesController(MyDbContext context)
    {
        _context = context;
    }

    // GET: api/Docente
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Docente>>> GetDocente()
    {
        return await _context.Docentes.ToListAsync();
    }

    // GET: api/Docente/buscar
    [HttpGet("buscar")]
    public async Task<ActionResult<IEnumerable<Docente>>> BuscarDocente([FromQuery] DocenteBusquedaParametros parametros)
    {
        var consulta = _context.Docentes.AsQueryable();
        if (!string.IsNullOrEmpty(parametros.buscar))
        {
            consulta = consulta.Where(docente => docente.nombre.Contains(parametros.buscar));
        }
        if (!string.IsNullOrEmpty(parametros.buscar) && consulta.Count() <= 0)
        {
            consulta = _context.Docentes.AsQueryable();
            consulta = consulta.Where(docente => docente.codigo.Contains(parametros.buscar));
        }
        return await consulta.ToListAsync();
    }

    // GET: api/Docente/5
    [HttpGet("{iddocente}")]
    public async Task<ActionResult<Docente>> GetDocente(int iddocente)
    {
        var docente = await _context.Docentes.FindAsync(iddocente);

        if (docente == null)
        {
            return NotFound();
        }

        return docente;
    }

    // PUT: api/Docente/5
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPut("{iddocente}")]
    public async Task<IActionResult> PutDocente(int? iddocente, Docente docente)
    {
        if (iddocente != docente.idDocente)
        {
            return BadRequest();
        }

        _context.Entry(docente).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!DocenteExists(iddocente))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return CreatedAtAction("GetDocente", new { iddocente = docente.idDocente }, docente);
    }

    // POST: api/Docente
    // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
    [HttpPost]
    public async Task<ActionResult<Docente>> PostDocente(Docente docente)
    {
        _context.Docentes.Add(docente);
        await _context.SaveChangesAsync();

        return CreatedAtAction("GetDocente", new { iddocente = docente.idDocente }, docente);
    }

    // DELETE: api/Docente/5
    [HttpDelete("{iddocente}")]
    public async Task<IActionResult> DeleteDocente(int? iddocente)
    {
        var docente = await _context.Docentes.FindAsync(iddocente);
        if (docente == null)
        {
            return NotFound();
        }

        _context.Docentes.Remove(docente);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool DocenteExists(int? iddocente)
    {
        return _context.Docentes.Any(e => e.idDocente == iddocente);
    }
}
