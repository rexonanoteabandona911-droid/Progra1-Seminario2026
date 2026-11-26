using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mishi_App_para_web.Models
{
    [Table("Donaciones")]
    public class Donacion
    {
        [Key]
        public int Id { get; set; }

        public int? UsuarioId { get; set; }

        [Required]
        [StringLength(60)]
        public string TipoInsumo { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Cantidad { get; set; }

        public DateTime FechaDonacion { get; set; }

        [StringLength(200)]
        public string? Observaciones { get; set; }
    }
}



