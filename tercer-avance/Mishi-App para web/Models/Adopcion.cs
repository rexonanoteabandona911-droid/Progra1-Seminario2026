
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mishi_App_para_web.Models
{
    [Table("Adopciones")]
    public class Adopcion
    {
        [Key]
        [Column("id_adopcion")]
        public int IdAdopcion { get; set; }

        [Required]
        [Column("id_solicitud")]
        public int IdSolicitud { get; set; }

        [Required]
        [Column("Fecha_Adopcion", TypeName = "date")]
        public DateTime FechaAdopcion { get; set; }

        [StringLength(300)]
        [Column("Observaciones")]
        public string? Observaciones { get; set; }
    }
}

