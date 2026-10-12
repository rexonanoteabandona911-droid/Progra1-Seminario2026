using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace miPrimeaAplicacion
{
    public partial class frmMaterias : Form
    {
        public frmMaterias()
        {
            InitializeComponent();
        }
        Conexion objConexion = new Conexion();
        DataSet ds = new DataSet();
        DataTable dt = new DataTable();
        String accion = "nuevo";
        int posicion = 0;

        private void obtenerDatos()
        {
            ds.Clear();
            ds = objConexion.obtenerDatos();
            dt = ds.Tables["materias"];
            dt.PrimaryKey = new DataColumn[] { dt.Columns["idMateria"] };

            grdDatosMaterias.DataSource = dt.DefaultView;
            mostrarDatos();
        }
        private void mostrarDatos()
        {
            if (dt.Rows.Count > 0)
            {
                idMateria.Text = dt.Rows[posicion]["idMateria"].ToString();
                txtCodigoMateria.Text = dt.Rows[posicion]["codigo"].ToString();
                txtNombreMateria.Text = dt.Rows[posicion]["nombre"].ToString();
                txtUvMateria.Text = dt.Rows[posicion]["uv"].ToString();

                lblRegistrosMateria.Text = (posicion + 1) + " de " + dt.Rows.Count;
            }
        }
        private void limpiarControles()
        {
            idMateria.Text = "";
            txtCodigoMateria.Text = "";
            txtNombreMateria.Text = "";
            txtUvMateria.Text = "";
        }

        private void activarDesactivarCtrls(Boolean estado)
        {
            grbDatos.Enabled = estado;
            grbNavegacion.Enabled = !estado;
            btnEliminarMateria.Enabled = !estado;
            txtBuscarMaterias.Enabled = !estado;
        }
        private void btnAgregarMateria_Click(object sender, EventArgs e)
        {
            if (btnAgregarMateria.Text == "Agregar"){
                btnAgregarMateria.Text = "Guardar";
                btnModificarMateria.Text = "Cancelar";

                accion = "nuevo";
                limpiarControles();

                activarDesactivarCtrls(true);
            }else{//Guardar
                String[] materias = { idMateria.Text, txtCodigoMateria.Text, txtNombreMateria.Text, txtUvMateria.Text };
                String respuesta = objConexion.administrarDatosMaterias(materias, accion);
                if (respuesta != "1"){
                    MessageBox.Show(respuesta, "Error al guardar materias.", MessageBoxButtons.OK, MessageBoxIcon.Error);
                } else {
                    activarDesactivarCtrls(false);
                    btnAgregarMateria.Text = "Nuevo";
                    btnModificarMateria.Text = "Modificar";
                    obtenerDatos();
                }
            }
        }

        private void btnModificarMateria_Click(object sender, EventArgs e)
        {

            if (btnModificarMateria.Text == "Modificar"){
                btnAgregarMateria.Text = "Guardar";
                btnModificarMateria.Text = "Cancelar";
                activarDesactivarCtrls(true);
                accion = "modificar";
            }else{//Guardar
                mostrarDatos();
                activarDesactivarCtrls(false);
                btnAgregarMateria.Text = "Agregar";
                btnModificarMateria.Text = "Modificar";
            }
        }
        private void btnSiguienteMateria_Click(object sender, EventArgs e)
        {
            if (posicion < dt.Rows.Count - 1){
                posicion++;// posicion=posicion+1
                mostrarDatos();
            } else{
                MessageBox.Show("Estas en el ultimo registro.", "Navegacion de Materias", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        private void btnUltimoMateria_Click(object sender, EventArgs e)
        {
            posicion = dt.Rows.Count - 1;
            mostrarDatos();
        }
        private void btnAnteriorMateria_Click(object sender, EventArgs e)
        {
            if (posicion > 0) {
                posicion--;// posicion=posicion-1
                mostrarDatos();
            }else{
                MessageBox.Show("Estas en el primer registro.", "Navegacion de Materias", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        private void btnPrimeroMateria_Click(object sender, EventArgs e)
        {
            posicion = 0;
            mostrarDatos();
        }

        private void btnEliminarMateria_Click(object sender, EventArgs e)
        {
            if (MessageBox.Show("Esta seguro de eliminar a " + txtNombreMateria.Text,
                "Eliminando materias", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
            {
                String respuesta = objConexion.administrarDatosMaterias(
                    new String[] { idMateria.Text, "", "", "" }, "eliminar"
                );
                if (respuesta != "1"){
                    MessageBox.Show(respuesta, "Error al eliminar materia.", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }else{
                    posicion = 0;
                    obtenerDatos();
                }
            }
        }
        private void frmMaterias_Load(object sender, EventArgs e)
        {
            obtenerDatos();
        }

        private void txtBuscarMaterias_KeyUp(object sender, KeyEventArgs e)
        {
            try
            {
                filtrarDatos(txtBuscarMaterias.Text);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        private void filtrarDatos(String valor)
        {
            try
            {
                DataView dv = dt.DefaultView;
                dv.RowFilter = "Convert(codigo, 'System.String') like '%" + valor + "%' or nombre like '%" + valor + "%'";
                grdDatosMaterias.DataSource = dv;
                seleccionarMateria();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        private void seleccionarMateria()
        {
            try
            {
                if (grdDatosMaterias.CurrentRow == null)
                {
                    MessageBox.Show("No hay filas que mostrar");
                    return;
                }
                String id = grdDatosMaterias.CurrentRow.Cells["id"].Value.ToString();
                posicion = dt.Rows.IndexOf(dt.Rows.Find(id));
                mostrarDatos();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
    }
}
