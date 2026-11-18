using System.ComponentModel.DataAnnotations;

namespace webapp.Models
{
    public class Materia
    {
        public int idMateria { get; set; }

        public int codigo { get; set; } // Cambiado de string a int
        public string nombre { get; set; }
        public byte uv { get; set; }    // Opcional: tinyint en SQL equivale a byte en C#
    }
}
