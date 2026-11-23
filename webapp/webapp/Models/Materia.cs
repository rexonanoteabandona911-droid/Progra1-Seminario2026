using System.ComponentModel.DataAnnotations;

namespace webapp.Models
{
    public class Materia
    {
        public int idMateria { get; set; }

        public int codigo { get; set; } 
        public string nombre { get; set; }
        public int uv { get; set; }    
    }
}
