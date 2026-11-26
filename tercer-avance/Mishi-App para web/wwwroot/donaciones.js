// ============================================================
// GESTIÓN DE DONACIONES - ADOPTA AMOR
// Compatible con el HTML compartido y /api/Donaciones (solo tabla Donaciones)
// ============================================================
"use strict";

const API_URL = "/api/Donaciones";
const $ = id => document.getElementById(id);
let donaciones = [];
let seleccionadoId = null;
let solicitudEnCurso = false;

document.addEventListener("DOMContentLoaded", iniciarModulo);

function iniciarModulo() {
    const ids = [
        "formDonacion", "txtId", "txtUsuarioId", "txtTipoInsumo", "txtCantidad",
        "txtFechaDonacion", "txtObservaciones", "btnAgregar", "btnModificar",
        "btnEliminar", "btnLimpiar", "txtBuscar", "btnBorrarBusqueda", "btnTodas",
        "tbodyDonaciones", "lblCantMostrada", "statTotal", "statCantidad",
        "modalOverlay", "modalCaja", "modalIcono", "modalTitulo", "modalMensaje", "modalBotones"
    ];
    const faltantes = ids.filter(id => !$(id));
    if (faltantes.length) {
        console.error("Faltan elementos en donaciones.html:", faltantes);
        alert("No se pudo iniciar Donaciones. Faltan elementos HTML: " + faltantes.join(", "));
        return;
    }

    $("formDonacion").addEventListener("submit", agregarDonacion);
    $("btnModificar").addEventListener("click", modificarDonacion);
    $("btnEliminar").addEventListener("click", eliminarDonacion);
    $("btnLimpiar").addEventListener("click", limpiarFormulario);
    $("txtBuscar").addEventListener("input", () => { actualizarBotonBusqueda(); renderizarTabla(); });
    $("btnBorrarBusqueda").addEventListener("click", () => {
        $("txtBuscar").value = "";
        actualizarBotonBusqueda();
        renderizarTabla();
        $("txtBuscar").focus();
    });
    $("btnTodas").addEventListener("click", () => {
        $("txtBuscar").value = "";
        actualizarBotonBusqueda();
        renderizarTabla();
    });
    $("modalOverlay").addEventListener("click", e => { if (e.target === $("modalOverlay")) cerrarModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarModal(); });

    [["txtUsuarioId", "grpUsuario"], ["txtTipoInsumo", "grpTipoInsumo"], ["txtCantidad", "grpCantidad"], ["txtFechaDonacion", "grpFecha"]].forEach(([inputId, groupId]) => {
        $(inputId).addEventListener("input", () => $(groupId).classList.remove("invalido"));
        $(inputId).addEventListener("change", () => $(groupId).classList.remove("invalido"));
    });

    cargarFechaActual();
    actualizarBotonBusqueda();
    cargarDonaciones();
}

async function leerRespuesta(response) {
    const texto = await response.text();
    let data = null;
    if (texto) {
        try { data = JSON.parse(texto); } catch { data = texto; }
    }
    if (!response.ok) throw new Error(mensajeError(data, response.status));
    return data;
}

function mensajeError(data, status) {
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
        if (data.message) return data.message;
        if (data.title) return data.title;
        if (data.error) return data.error;
        if (data.errors) {
            const mensajes = Object.values(data.errors).flat().filter(Boolean);
            if (mensajes.length) return mensajes.join(" ");
        }
        if (data.detail) return data.detail;
    }
    if (status === 400) return "Los datos enviados no son válidos. Revisa los campos.";
    if (status === 404) return "No se encontró el registro o la dirección de la API.";
    if (status === 500) return "Ocurrió un error interno en el servidor.";
    return `No se pudo completar la operación. Código HTTP: ${status}.`;
}

function prop(obj, camel, pascal) {
    return obj?.[camel] ?? obj?.[pascal];
}

function ordenarDonaciones(arr) {
    return [...arr].sort((a, b) => Number(prop(a, "id", "Id") || 0) - Number(prop(b, "id", "Id") || 0));
}

function nroCorrelativo(idReal) {
    const idx = donaciones.findIndex(x => Number(prop(x, "id", "Id")) === Number(idReal));
    return idx >= 0 ? idx + 1 : idReal;
}

function mostrarModal(titulo, mensaje, tipo = "info", acciones = null) {
    $("modalCaja").className = `modal ${tipo}`;
    $("modalTitulo").textContent = titulo;
    $("modalMensaje").textContent = mensaje;
    const iconos = { ok: "fa-circle-check", error: "fa-circle-xmark", warn: "fa-triangle-exclamation", info: "fa-circle-info" };
    $("modalIcono").className = `fa-solid ${iconos[tipo] || iconos.info}`;
    const contenedor = $("modalBotones");
    contenedor.replaceChildren();
    (acciones || [{ texto: "ACEPTAR", clase: "principal", accion: cerrarModal }]).forEach(a => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = a.texto;
        boton.className = a.clase || "";
        boton.addEventListener("click", async () => { cerrarModal(); if (a.accion) await a.accion(); });
        contenedor.appendChild(boton);
    });
    $("modalOverlay").classList.add("abierto");
}

function cerrarModal() {
    $("modalOverlay")?.classList.remove("abierto");
}

async function cargarDonaciones(mostrarError = true) {
    try {
        const response = await fetch(API_URL, { headers: { Accept: "application/json" }, cache: "no-store" });
        const data = await leerRespuesta(response);
        donaciones = Array.isArray(data) ? ordenarDonaciones(data) : [];
        renderizarTabla();
        actualizarResumen();
        return true;
    } catch (error) {
        console.error("Error cargando donaciones:", error);
        donaciones = [];
        renderizarTabla();
        actualizarResumen();
        if (mostrarError) mostrarModal("No se pudieron cargar las donaciones", error.message + " Comprueba que DonacionesController esté ejecutándose.", "error");
        return false;
    }
}

function renderizarTabla() {
    const tbody = $("tbodyDonaciones");
    if (!tbody) return;
    const buscar = ($("txtBuscar").value || "").trim().toLocaleLowerCase("es");
    const lista = donaciones.filter(d => [
        prop(d, "id", "Id"), prop(d, "usuarioId", "UsuarioId"), prop(d, "tipoInsumo", "TipoInsumo"),
        prop(d, "cantidad", "Cantidad"), prop(d, "fechaDonacion", "FechaDonacion"), prop(d, "observaciones", "Observaciones")
    ].some(v => String(v ?? "").toLocaleLowerCase("es").includes(buscar)));

    $("lblCantMostrada").textContent = lista.length;
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="vacio"><i class="fa-solid fa-magnifying-glass"></i><h3>No hay donaciones</h3><p>No se encontraron registros con esa búsqueda.</p></td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map((d, idx) => {
        const id = Number(prop(d, "id", "Id"));
        const nroOrden = idx + 1;
        const usuario = prop(d, "usuarioId", "UsuarioId");
        const tipo = prop(d, "tipoInsumo", "TipoInsumo") ?? "";
        const cantidad = Number(prop(d, "cantidad", "Cantidad") ?? 0);
        const fecha = prop(d, "fechaDonacion", "FechaDonacion");
        const observaciones = prop(d, "observaciones", "Observaciones") ?? "";
        return `<tr class="fila ${id === Number(seleccionadoId) ? "sel" : ""}" data-id="${id}"><td class="id-num">#${nroOrden}</td><td>${escaparHtml(usuario ?? "—")}</td><td><span class="etq">${escaparHtml(tipo)}</span></td><td>${Number.isFinite(cantidad) ? cantidad.toFixed(2) : "0.00"}</td><td>${escaparHtml(formatearFecha(fecha))}</td><td>${escaparHtml(observaciones || "—")}</td></tr>`;
    }).join("");

    tbody.querySelectorAll("tr[data-id]").forEach(fila => fila.addEventListener("click", () => seleccionarDonacion(Number(fila.dataset.id))));
}

function actualizarResumen() {
    $("statTotal").querySelector("b").textContent = donaciones.length;
    const suma = donaciones.reduce((total, d) => total + Number(prop(d, "cantidad", "Cantidad") || 0), 0);
    $("statCantidad").querySelector("b").textContent = suma.toFixed(2);
}

function actualizarBotonBusqueda() {
    $("btnBorrarBusqueda").classList.toggle("visible", Boolean($("txtBuscar").value.trim()));
}

function seleccionarDonacion(id) {
    const d = donaciones.find(x => Number(prop(x, "id", "Id")) === id);
    if (!d) return;
    seleccionadoId = id;
    $("txtId").value = nroCorrelativo(id);
    const uid = prop(d, "usuarioId", "UsuarioId");
    $("txtUsuarioId").value = uid == null ? "" : uid;
    $("txtTipoInsumo").value = prop(d, "tipoInsumo", "TipoInsumo") ?? "";
    $("txtCantidad").value = prop(d, "cantidad", "Cantidad") ?? "";
    $("txtFechaDonacion").value = fechaParaInput(prop(d, "fechaDonacion", "FechaDonacion"));
    $("txtObservaciones").value = prop(d, "observaciones", "Observaciones") ?? "";
    $("txtModo").textContent = `Modificando #${nroCorrelativo(id)}`;
    $("badgeModo").classList.add("editando");
    $("btnAgregar").disabled = true;
    $("btnModificar").disabled = false;
    $("btnEliminar").disabled = false;
    limpiarErrores();
    renderizarTabla();
}

function obtenerDatos() {
    const fecha = $("txtFechaDonacion").value.trim();
    const rawUsuario = $("txtUsuarioId").value.trim();
    return {
        usuarioId: rawUsuario ? Number(rawUsuario) : null,
        tipoInsumo: $("txtTipoInsumo").value.trim(),
        cantidad: Number($("txtCantidad").value),
        fechaDonacion: fecha ? `${fecha}:00` : "",
        observaciones: $("txtObservaciones").value.trim() || null
    };
}

function validar(d) {
    limpiarErrores();
    if (!d.tipoInsumo) return errorCampo("grpTipoInsumo", "Ingresa el tipo de insumo.", "txtTipoInsumo");
    if (d.tipoInsumo.length > 60) return errorCampo("grpTipoInsumo", "El tipo de insumo no puede superar 60 caracteres.", "txtTipoInsumo");
    if (!Number.isFinite(d.cantidad) || d.cantidad <= 0 || d.cantidad > 99999999.99) return errorCampo("grpCantidad", "La cantidad debe ser mayor que cero y no superar 99999999.99.", "txtCantidad");
    if (!d.fechaDonacion || Number.isNaN(Date.parse(d.fechaDonacion))) return errorCampo("grpFecha", "Selecciona la fecha y hora de la donación.", "txtFechaDonacion");
    if (d.observaciones && d.observaciones.length > 200) {
        mostrarModal("Revisa las observaciones", "Las observaciones no pueden superar 200 caracteres.", "warn");
        $("txtObservaciones").focus();
        return false;
    }
    return true;
}

function errorCampo(grupo, mensaje, input) {
    $(grupo).classList.add("invalido");
    mostrarModal("Revisa los datos", mensaje, "warn");
    $(input).focus();
    return false;
}

function limpiarErrores() {
    ["grpUsuario", "grpTipoInsumo", "grpCantidad", "grpFecha"].forEach(id => $(id)?.classList.remove("invalido"));
}

async function agregarDonacion(evento) {
    evento.preventDefault();
    if (solicitudEnCurso) return;
    const datos = obtenerDatos();
    if (!validar(datos)) return;
    await ejecutarOperacion(async () => {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(datos)
        });
        await leerRespuesta(response);
        const actualizado = await cargarDonaciones(false);
        limpiarFormulario();
        mostrarModal("¡Donación registrada!", actualizado ? "La nueva donación se guardó correctamente en la base de datos." : "La donación se guardó, pero no se pudo actualizar la tabla.", "ok");
    }, "No se pudo agregar la donación");
}

async function modificarDonacion() {
    if (seleccionadoId === null) {
        mostrarModal("Selecciona una donación", "Haz clic en una fila de la tabla para modificarla.", "warn");
        return;
    }
    if (solicitudEnCurso) return;
    const datos = obtenerDatos();
    if (!validar(datos)) return;
    await ejecutarOperacion(async () => {
        const response = await fetch(`${API_URL}/${seleccionadoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ id: seleccionadoId, ...datos })
        });
        await leerRespuesta(response);
        const actualizado = await cargarDonaciones(false);
        limpiarFormulario();
        mostrarModal("¡Donación actualizada!", actualizado ? "Los datos de la donación se modificaron correctamente." : "La donación se modificó, pero no se pudo actualizar la tabla.", "ok");
    }, "No se pudo modificar la donación");
}

function eliminarDonacion() {
    if (seleccionadoId === null) {
        mostrarModal("Selecciona una donación", "Haz clic en una fila de la tabla para eliminarla.", "warn");
        return;
    }
    const id = seleccionadoId;
    const nro = nroCorrelativo(id);
    mostrarModal("¿Eliminar donación?", `¿Seguro que deseas eliminar la donación #${nro}? Esta acción no se puede deshacer.`, "warn", [
        { texto: "CANCELAR", clase: "", accion: () => { } },
        { texto: "ELIMINAR", clase: "peligro", accion: () => confirmarEliminar(id) }
    ]);
}

async function confirmarEliminar(id) {
    if (solicitudEnCurso) return;
    await ejecutarOperacion(async () => {
        const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        await leerRespuesta(response);
        const actualizado = await cargarDonaciones(false);
        limpiarFormulario();
        mostrarModal("¡Donación eliminada!", actualizado ? "La donación se eliminó correctamente de la base de datos." : "La donación se eliminó, pero no se pudo actualizar la tabla.", "ok");
    }, "No se pudo eliminar la donación");
}

async function ejecutarOperacion(operacion, tituloError) {
    solicitudEnCurso = true;
    $("btnAgregar").disabled = true;
    $("btnModificar").disabled = true;
    $("btnEliminar").disabled = true;
    $("btnAgregar").classList.add("cargando");
    try { await operacion(); }
    catch (error) { console.error(tituloError, error); mostrarModal(tituloError, error.message, "error"); }
    finally {
        solicitudEnCurso = false;
        $("btnAgregar").classList.remove("cargando");
        const editando = seleccionadoId !== null;
        $("btnAgregar").disabled = editando;
        $("btnModificar").disabled = !editando;
        $("btnEliminar").disabled = !editando;
    }
}

function limpiarFormulario() {
    $("formDonacion").reset();
    seleccionadoId = null;
    $("txtId").value = "";
    $("txtModo").textContent = "Nuevo registro";
    $("badgeModo").classList.remove("editando");
    $("btnAgregar").disabled = false;
    $("btnModificar").disabled = true;
    $("btnEliminar").disabled = true;
    limpiarErrores();
    cargarFechaActual();
    renderizarTabla();
}

function cargarFechaActual() {
    const ahora = new Date();
    const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
    $("txtFechaDonacion").value = local.toISOString().slice(0, 16);
}

function fechaParaInput(valor) {
    if (!valor) return "";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "";
    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function formatearFecha(valor) {
    if (!valor) return "—";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleString("es-SV", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function escaparHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}