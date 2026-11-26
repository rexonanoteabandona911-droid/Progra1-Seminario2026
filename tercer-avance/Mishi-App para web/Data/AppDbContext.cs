using Microsoft.EntityFrameworkCore;
using Mishi_App_para_web.Models;

namespace Mishi_App_para_web
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Gato> Gatos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<SolicitudAdopcion> Solicitudes_Adopciones { get; set; }
        public DbSet<Adopcion> Adopciones { get; set; }
        public DbSet<Donacion> Donaciones { get; set; }
        public DbSet<ReporteCalle> Reportes_Calle { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Gato>().ToTable("Gatos");
            modelBuilder.Entity<Usuario>().ToTable("Usuarios");
            modelBuilder.Entity<SolicitudAdopcion>().ToTable("Solicitudes_Adopciones");
            modelBuilder.Entity<Donacion>().ToTable("Donaciones");

            modelBuilder.Entity<ReporteCalle>(entity =>
            {
                entity.ToTable("Reportes_Calle");
                entity.HasKey(e => e.IdReporte);
                entity.Property(e => e.IdReporte).HasColumnName("id_reporte");
                entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
                entity.Property(e => e.IdRescatista).HasColumnName("id_rescatista");
                entity.Property(e => e.Direccion).HasColumnName("Direccion").HasMaxLength(250).IsRequired();
                entity.Property(e => e.Descripcion).HasColumnName("Descripcion").HasMaxLength(500);
                entity.Property(e => e.CantidadGatos).HasColumnName("Cantidad_Gatos");
                entity.Property(e => e.FechaReporte).HasColumnName("Fecha_Reporte").HasColumnType("datetime2");
                entity.Property(e => e.Estado).HasColumnName("Estado").HasMaxLength(20).IsRequired();
                entity.Property(e => e.FechaAtencion).HasColumnName("Fecha_Atencion").HasColumnType("datetime2");
            });

            modelBuilder.Entity<Adopcion>(entity =>
            {
                entity.ToTable("Adopciones");
                entity.HasKey(e => e.IdAdopcion);
                entity.Property(e => e.IdAdopcion).HasColumnName("id_adopcion");
                entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud");
                entity.Property(e => e.FechaAdopcion).HasColumnName("Fecha_Adopcion").HasColumnType("date");
                entity.Property(e => e.Observaciones).HasColumnName("Observaciones").HasMaxLength(300).IsRequired(false);
            });
        }
    }
}
