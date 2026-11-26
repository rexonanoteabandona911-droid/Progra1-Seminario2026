
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mishi_App_para_web.Models
{
    [Table("Solicitudes_Adopciones")]
    public class SolicitudAdopcion
    {
        [Key]
        [Column("id_solicitud")]
        public int Id { get; set; }

        [Required]
        [Column("id_gato")]
        public int GatoId { get; set; }

        [Required]
        [Column("id_adoptante")]
        public int AdoptanteId { get; set; }

        [Column("id_usuario_revisor")]
        public int? UsuarioRevisorId { get; set; }

        [Column("Fecha_Solicitud")]
        public DateTime Fecha { get; set; }

        [Required]
        [StringLength(20)]
        [Column("Estado_Solicitud")]
        public string Estado { get; set; } = "Pendiente";

        [StringLength(500)]
        [Column("Comentarios")]
        public string? Comentarios { get; set; }

        [Column("Fecha_Revision")]
        public DateTime? FechaRevision { get; set; }
    }
}

