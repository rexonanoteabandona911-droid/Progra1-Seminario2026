using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mishi_App_para_web.Models
{
    [Table("Gatos")]
    public class Gato
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Column("Nombre")]
        public string Nombre { get; set; } 

        [Column("Estado")]
        public string Estado { get; set; } 

        [Column("id_raza")]
        public int? IdRaza { get; set; } 

        [Column("id_reporte")]
        public int? IdReporte { get; set; } 

        [Column("Fecha_Nacimiento")]
        public DateTime? FechaNacimiento { get; set; } 

        [Column("Sexo")]
        public string? Sexo { get; set; } 

        [NotMapped]
        public int? Edad
        {
            get
            {
                if (!FechaNacimiento.HasValue) return null;
                var hoy = DateTime.Today;
                var edad = hoy.Year - FechaNacimiento.Value.Year;
                if (FechaNacimiento.Value.Date > hoy.AddYears(-edad)) edad--;
                return edad;
            }
        }
    }
}