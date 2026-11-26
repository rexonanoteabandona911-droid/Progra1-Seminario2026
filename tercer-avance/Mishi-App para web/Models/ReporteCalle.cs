using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mishi_App_para_web.Models
{
        public class ReporteCalle
        {
            [Key]
            [Column("id_reporte")]
            public int IdReporte { get; set; }

            [Column("id_usuario")]
            public int? IdUsuario { get; set; }

            [Column("id_rescatista")]
            public int? IdRescatista { get; set; }

            [Required]
            [StringLength(250)]
            [Column("Direccion")]
            public string Direccion { get; set; } = string.Empty;

            [StringLength(500)]
            [Column("Descripcion")]
            public string? Descripcion { get; set; }

            [Column("Cantidad_Gatos")]
            public int? CantidadGatos { get; set; }

            [Column("Fecha_Reporte")]
            public DateTime? FechaReporte { get; set; }

            [Required]
            [StringLength(20)]
            [Column("Estado")]
            public string Estado { get; set; } = "Pendiente";

            [Column("Fecha_Atencion")]
            public DateTime? FechaAtencion { get; set; }
        }
}
