// Gestión de Reportes - Adopta Amor
// Este archivo trabaja con ReportesCallesController.cs
document.addEventListener('DOMContentLoaded', iniciarGestionReportes);

function iniciarGestionReportes() {
    const $ = id => document.getElementById(id);
    const API = '/api/reportes-calles';

    const form = $('formReporte');
    const campos = {
        id: $('txtId'), usuario: $('selUsuario'), rescatista: $('selRescatista'),
        direccion: $('txtDireccion'), descripcion: $('txtDescripcion'),
        cantidad: $('txtCantidad'), fecha: $('txtFecha'), estado: $('selEstado'),
        atencion: $('txtAtencion')
    };
    const btnAgregar = $('btnAgregar'), btnModificar = $('btnModificar');
    const btnEliminar = $('btnEliminar'), btnLimpiar = $('btnLimpiar');
    const tbody = $('tbodyReportes');
    let reportes = [], seleccionado = null, filtro = 'todos', ocupado = false;

    function ordenarReportes(arr) {
        return [...arr].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }

    function nroCorrelativo(idReal) {
        const idx = reportes.findIndex(x => Number(x.id) === Number(idReal));
        return idx >= 0 ? idx + 1 : idReal;
    }

    async function peticion(url, opciones = {}) {
        const respuesta = await fetch(url, {
            ...opciones,
            headers: { ...(opciones.body ? { 'Content-Type': 'application/json' } : {}), ...(opciones.headers || {}) }
        });
        const texto = await respuesta.text();
        let datos = null;
        try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
        if (!respuesta.ok) {
            throw new Error(datos?.mensaje || datos?.title || (typeof datos === 'string' ? datos : `Error HTTP ${respuesta.status}`));
        }
        return datos;
    }

    function modal(tipo, titulo, mensaje, botones) {
        const overlay = $('modalOverlay'), caja = $('modalCaja');
        if (!overlay || !caja) { alert(`${titulo}\n\n${mensaje}`); return; }
        caja.className = `modal ${tipo}`;
        $('modalTitulo').textContent = titulo;
        $('modalMensaje').textContent = mensaje;
        $('modalIcono').className = tipo === 'ok' ? 'fa-solid fa-circle-check' :
            tipo === 'warn' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-xmark';
        const cont = $('modalBotones');
        cont.replaceChildren();
        botones.forEach(b => {
            const el = document.createElement('button');
            el.type = 'button'; el.textContent = b.texto;
            if (b.principal) el.classList.add('principal');
            if (b.peligro) el.classList.add('peligro');
            el.addEventListener('click', b.accion);
            cont.appendChild(el);
        });
        overlay.classList.add('abierto');
    }
    function cerrarModal() { $('modalOverlay')?.classList.remove('abierto'); }
    function error(m) { modal('error', 'No se pudo completar', m, [{ texto: 'Cerrar', principal: true, accion: cerrarModal }]); }
    function marcar(id, mal) { $(id)?.classList.toggle('invalido', !!mal); }
    function limpiarErrores() {
        ['grpUsuario', 'grpDireccion', 'grpCantidad', 'grpFecha', 'grpEstado', 'grpAtencion'].forEach(x => marcar(x, false));
    }

    function datosFormulario() {
        return {
            idUsuario: Number(campos.usuario.value) || null,
            idRescatista: Number(campos.rescatista.value) || null,
            direccion: campos.direccion.value.trim(),
            descripcion: campos.descripcion.value.trim() || null,
            cantidadGatos: Number(campos.cantidad.value),
            fechaReporte: campos.fecha.value,
            estado: campos.estado.value,
            fechaAtencion: campos.atencion.value || null
        };
    }
    function validar(d) {
        limpiarErrores();
        let ok = true;
        if (!d.idUsuario) { marcar('grpUsuario', true); ok = false; }
        if (d.direccion.length < 3 || d.direccion.length > 200) { marcar('grpDireccion', true); ok = false; }
        if (!Number.isInteger(d.cantidadGatos) || d.cantidadGatos < 1 || d.cantidadGatos > 999) { marcar('grpCantidad', true); ok = false; }
        if (!d.fechaReporte) { marcar('grpFecha', true); ok = false; }
        if (!d.estado) { marcar('grpEstado', true); ok = false; }
        if (d.fechaAtencion && d.fechaReporte && d.fechaAtencion < d.fechaReporte) { marcar('grpAtencion', true); ok = false; }
        if (!ok) modal('warn', 'Revisa el formulario', 'Completa los campos obligatorios y verifica las fechas.', [{ texto: 'Entendido', principal: true, accion: cerrarModal }]);
        return ok;
    }

    async function cargarCatalogos() {
        const [usuarios, rescatistas] = await Promise.all([
            peticion(`${API}/usuarios`), peticion(`${API}/rescatistas`)
        ]);
        campos.usuario.innerHTML = '<option value="">Selecciona quién reporta</option>';
        usuarios.forEach(u => {
            const o = document.createElement('option'); o.value = u.id; o.textContent = u.nombre || `Usuario ${u.id}`;
            campos.usuario.appendChild(o);
        });
        campos.rescatista.innerHTML = '<option value="">Sin asignar</option>';
        rescatistas.forEach(r => {
            const o = document.createElement('option'); o.value = r.id;
            o.textContent = r.zona ? `${r.nombre} — ${r.zona}` : r.nombre;
            campos.rescatista.appendChild(o);
        });
    }

    function listaFiltrada() {
        const q = ($('txtBuscar')?.value || '').trim().toLowerCase();
        return reportes.filter(r => {
            const e = (r.estado || '').toLowerCase();
            const filtroOk = filtro === 'todos' || (filtro === 'pendiente' && e === 'pendiente') ||
                (filtro === 'proceso' && e === 'en proceso') || (filtro === 'atendido' && e === 'atendido');
            return filtroOk && [r.id, r.reportante, r.rescatista, r.zona, r.direccion, r.descripcion, r.estado, r.fechaReporte].join(' ').toLowerCase().includes(q);
        });
    }
    function actualizarTabla() {
        $('statTotal').textContent = reportes.length;
        $('statPend').textContent = reportes.filter(r => (r.estado || '').toLowerCase() === 'pendiente').length;
        $('statAtend').textContent = reportes.filter(r => (r.estado || '').toLowerCase() === 'atendido').length;
        const lista = listaFiltrada();
        $('lblCantMostrada').textContent = lista.length;
        tbody.replaceChildren();
        if (!lista.length) {
            const tr = document.createElement('tr'), td = document.createElement('td');
            td.colSpan = 5; td.className = 'vacio';
            td.textContent = reportes.length ? 'No hay reportes que coincidan con la búsqueda.' : 'Todavía no hay reportes registrados.';
            tr.appendChild(td); tbody.appendChild(tr); return;
        }
        lista.forEach((r, idx) => {
            const tr = document.createElement('tr'); tr.className = 'fila' + (Number(seleccionado) === Number(r.id) ? ' sel' : '');
            tr.addEventListener('click', () => seleccionar(r.id));
            const nroOrden = idx + 1;
            const valores = [nroOrden, r.direccion || 'Sin dirección', r.rescatista || 'Sin asignar', r.cantidadGatos ?? 0, r.estado || 'Sin estado'];
            valores.forEach((v, i) => {
                const td = document.createElement('td');
                if (i === 4) { const s = document.createElement('span'); s.className = 'estado ' + (String(v).toLowerCase() === 'pendiente' ? 'pend' : String(v).toLowerCase() === 'atendido' ? 'aten' : String(v).toLowerCase() === 'en proceso' ? 'proc' : 'otro'); s.textContent = v; td.appendChild(s); }
                else { td.textContent = v; if (i === 0) td.className = 'id-num'; if (i === 3) td.className = 'gatos'; }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }
    function seleccionar(id) {
        const r = reportes.find(x => Number(x.id) === Number(id)); if (!r) return;
        seleccionado = r.id; campos.id.value = nroCorrelativo(r.id); campos.usuario.value = String(r.idUsuario ?? '');
        campos.rescatista.value = r.idRescatista == null ? '' : String(r.idRescatista);
        campos.direccion.value = r.direccion || ''; campos.descripcion.value = r.descripcion || '';
        campos.cantidad.value = r.cantidadGatos ?? 1; campos.fecha.value = r.fechaReporte || '';
        campos.estado.value = r.estado || 'Pendiente'; campos.atencion.value = r.fechaAtencion || '';
        $('txtModo').textContent = 'Editando registro'; $('badgeModo').classList.add('editando');
        btnAgregar.disabled = true; btnModificar.disabled = false; btnEliminar.disabled = false; actualizarTabla();
    }
    function limpiarFormulario() {
        form.reset(); campos.id.value = ''; campos.cantidad.value = 1; campos.estado.value = 'Pendiente';
        seleccionado = null; $('txtModo').textContent = 'Nuevo registro'; $('badgeModo').classList.remove('editando');
        btnAgregar.disabled = false; btnModificar.disabled = true; btnEliminar.disabled = true; limpiarErrores();
        actualizarTabla();
    }
    async function cargarReportes() {
        const datos = await peticion(API) || [];
        reportes = ordenarReportes(datos);
        actualizarTabla();
    }
    async function guardar(e) {
        e?.preventDefault(); if (ocupado) return;
        const d = datosFormulario(); if (!validar(d)) return;
        ocupado = true; btnAgregar.disabled = true;
        try {
            await peticion(API, { method: 'POST', body: JSON.stringify(d) }); await cargarReportes(); limpiarFormulario();
            modal('ok', 'Reporte registrado', 'El reporte se guardó correctamente.', [{ texto: 'Aceptar', principal: true, accion: cerrarModal }]);
        } catch (ex) { error(ex.message); } finally { ocupado = false; btnAgregar.disabled = false; }
    }
    async function modificar() {
        if (ocupado) return; if (!seleccionado) { error('Selecciona un reporte de la tabla.'); return; }
        const d = datosFormulario(); if (!validar(d)) return; ocupado = true; btnModificar.disabled = true;
        try {
            await peticion(`${API}/${seleccionado}`, { method: 'PUT', body: JSON.stringify(d) }); await cargarReportes(); limpiarFormulario();
            modal('ok', 'Reporte actualizado', 'Los cambios se guardaron correctamente.', [{ texto: 'Aceptar', principal: true, accion: cerrarModal }]);
        } catch (ex) { error(ex.message); } finally { ocupado = false; btnModificar.disabled = false; }
    }
    async function eliminar() {
        if (ocupado || !seleccionado) return; const id = seleccionado; ocupado = true;
        try {
            await peticion(`${API}/${id}`, { method: 'DELETE' }); await cargarReportes(); limpiarFormulario();
            modal('ok', 'Reporte eliminado', 'El reporte se eliminó correctamente.', [{ texto: 'Aceptar', principal: true, accion: cerrarModal }]);
        } catch (ex) { error(ex.message); } finally { ocupado = false; }
    }

    form.addEventListener('submit', guardar);
    btnModificar.addEventListener('click', modificar);
    btnEliminar.addEventListener('click', () => {
        if (!seleccionado) { error('Selecciona un reporte de la tabla.'); return; }
        const nro = nroCorrelativo(seleccionado);
        modal('warn', '¿Eliminar reporte?', `Se eliminará el reporte #${nro}.`, [
            { texto: 'Cancelar', accion: cerrarModal }, { texto: 'Sí, eliminar', principal: true, peligro: true, accion: () => { cerrarModal(); eliminar(); } }
        ]);
    });
    btnLimpiar.addEventListener('click', limpiarFormulario);
    ['selUsuario', 'txtDireccion', 'txtCantidad', 'txtFecha', 'selEstado', 'txtAtencion'].forEach(id => {
        $(id)?.addEventListener('change', () => marcar(({ selUsuario: 'grpUsuario', txtDireccion: 'grpDireccion', txtCantidad: 'grpCantidad', txtFecha: 'grpFecha', selEstado: 'grpEstado', txtAtencion: 'grpAtencion' })[id], false));
        $(id)?.addEventListener('input', () => marcar(({ selUsuario: 'grpUsuario', txtDireccion: 'grpDireccion', txtCantidad: 'grpCantidad', txtFecha: 'grpFecha', selEstado: 'grpEstado', txtAtencion: 'grpAtencion' })[id], false));
    });
    $('txtBuscar').addEventListener('input', () => { $('btnBorrarBusqueda').classList.toggle('visible', !!$('txtBuscar').value); actualizarTabla(); });
    $('btnBorrarBusqueda').addEventListener('click', () => { $('txtBuscar').value = ''; $('btnBorrarBusqueda').classList.remove('visible'); actualizarTabla(); });
    document.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
        filtro = b.dataset.filtro; document.querySelectorAll('[data-filtro]').forEach(x => x.classList.remove('activo'));
        document.querySelectorAll(`[data-filtro="${filtro}"]`).forEach(x => x.classList.add('activo')); actualizarTabla();
    }));
    $('navToggle')?.addEventListener('click', () => $('navMenu')?.classList.toggle('abierto'));

    (async () => {
        try { await cargarCatalogos(); await cargarReportes(); limpiarFormulario(); }
        catch (ex) { tbody.innerHTML = `<tr><td colspan="5" class="vacio">No se pudieron cargar los datos.</td></tr>`; error(ex.message); }
    })();
}