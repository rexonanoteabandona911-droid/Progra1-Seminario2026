using System.ComponentModel.DataAnnotations;

namespace webapp.Models
{
    public class Materia
    {
        public int idMateria { get; set; }

        public string codigo { get; set; }
        public string nombre { get; set; }
        public string uv { get; set; }
    }
}
