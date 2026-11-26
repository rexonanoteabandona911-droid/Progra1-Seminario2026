// login.js
window.addEventListener('DOMContentLoaded', function () {
    const PAGINA_CATALOGO = 'gatos.html';          
    const PAGINA_PERFIL = 'perfil.html';           
    const DESTINO_NO_ENCONTRADO = 'perfil.html';   
    const ESPERA_NO_ENCONTRADO = 3000;            
    const ESPERA_SERVIDOR = 15000;                 

    const form = document.getElementById('frmLogin');
    const inCorreo = document.getElementById('correo');
    const inClave = document.getElementById('clave');
    const verClave = document.getElementById('verClave');
    const btn = document.getElementById('btn');
    const btnTexto = document.getElementById('btnTexto');

    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    const modalIcono = document.getElementById('modalIcono');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalTexto = document.getElementById('modalTexto');
    const modalBotones = document.getElementById('modalBotones');

    let timerRedireccion = null;

    const ICONO_OK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
    const ICONO_ERROR = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    if (!form || !inCorreo || !inClave || !btn || !overlay || !modal) {
        console.error('No se encontraron los elementos del formulario de login en login.html.');
        return;
    }

    function irA(pagina) {
        window.location.href = pagina;
    }

    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            navMenu.classList.toggle('abierto');
        });
    }

    if (verClave) {
        verClave.addEventListener('change', function () {
            const mostrar = verClave.checked;
            inClave.type = mostrar ? 'text' : 'password';

            const iconoOjo = document.getElementById('iconoOjo');
            const txtOjo = document.getElementById('txtOjo');

            if (iconoOjo) {
                iconoOjo.className = mostrar
                    ? 'fa-solid fa-eye'
                    : 'fa-solid fa-eye-slash';
            }

            if (txtOjo) {
                txtOjo.textContent = mostrar
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña';
            }
        });
    }

    function setCargando(cargando) {
        btn.disabled = cargando;
        btn.classList.toggle('cargando', cargando);
        btnTexto.textContent = cargando ? 'Entrando...' : 'Entrar';
    }

    function cerrarModal() {
        clearTimeout(timerRedireccion);
        overlay.classList.remove('abierto');
        setCargando(false);
    }
    function abrirModal(tipo, titulo, mensaje, botones, mostrarBarra, duracionBarra) {
        clearTimeout(timerRedireccion);

        modal.className = 'modal ' + tipo;
        modalIcono.innerHTML = tipo === 'ok' ? ICONO_OK : ICONO_ERROR;
        modalTitulo.textContent = titulo;
        modalTexto.textContent = mensaje;

        const barra = modal.querySelector('.barra');

        if (barra) {
            barra.style.display = mostrarBarra ? 'block' : 'none';

            const barraInterior = barra.querySelector('i');

            if (barraInterior) {
                barraInterior.style.animation = 'none';
                void barraInterior.offsetWidth;
                barraInterior.style.animation = '';
                if (mostrarBarra && duracionBarra) {
                    barraInterior.style.animationDuration = duracionBarra + 'ms';
                }
            }
        }

        modalBotones.innerHTML = '';

        botones.forEach(function (boton) {
            const elemento = document.createElement('button');

            elemento.type = 'button';
            elemento.textContent = boton.texto;

            if (boton.principal) {
                elemento.classList.add('principal');
            }

            elemento.addEventListener('click', boton.accion);
            modalBotones.appendChild(elemento);
        });

        overlay.classList.add('abierto');

        const primero = modalBotones.querySelector('button.principal') || modalBotones.querySelector('button');
        if (primero) primero.focus();
    }

    function marcarCampo(idCampo, invalido) {
        const campo = document.getElementById(idCampo);

        if (!campo) return;

        campo.classList.remove('invalido');

        if (invalido) {
            void campo.offsetWidth;
            campo.classList.add('invalido');
        }
    }
    function textoDeError(datos, estado) {
        let t = '';
        if (datos && datos.mensaje) t = datos.mensaje;
        else if (datos && datos.message) t = datos.message;
        else if (datos && datos.title) t = datos.title;
        else t = 'Inténtalo de nuevo en unos minutos.';
        return t + ' (error ' + estado + ')';
    }

    inCorreo.addEventListener('input', function () {
        marcarCampo('campoCorreo', false);
    });

    inClave.addEventListener('input', function () {
        marcarCampo('campoClave', false);
    });
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearTimeout(timerRedireccion);

        const correo = inCorreo.value.trim();
        const clave = inClave.value;

        const correoMal =
            !correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

        const claveMal = !clave;

        marcarCampo('campoCorreo', correoMal);
        marcarCampo('campoClave', claveMal);

        if (correoMal || claveMal) return;

        setCargando(true);
        const control = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const espera = setTimeout(function () { if (control) control.abort(); }, ESPERA_SERVIDOR);

        try {
            const respuesta = await fetch('/api/usuarios/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    correo: correo,
                    clave: clave
                }),
                signal: control ? control.signal : undefined
            });
            clearTimeout(espera);

            const datos = await respuesta.json().catch(function () {
                return {};
            });

            if (respuesta.ok) {
                try { localStorage.setItem('usuario', JSON.stringify(datos)); } catch (x) { }

                const nombre = datos.nombre ? ', ' + datos.nombre : '';

                abrirModal(
                    'ok',
                    '¡Usuario encontrado!',
                    'Hola' + nombre + '. Iniciaste sesión correctamente. ¿A dónde quieres ir?',
                    [
                        {
                            texto: 'Ir al catálogo',
                            principal: true,
                            accion: function () {
                                irA(PAGINA_CATALOGO);
                            }
                        },
                        {
                            texto: 'Mi perfil',
                            accion: function () {
                                irA(PAGINA_PERFIL);
                            }
                        }
                    ],
                    false
                );

            } else if (respuesta.status === 401) {
                const mensaje =
                    datos.mensaje ||
                    datos.message ||
                    'El correo electrónico o la contraseña son incorrectos.';

                const frase = /[.!?]$/.test(mensaje) ? mensaje : mensaje + '.';

                abrirModal(
                    'error',
                    'Usuario no encontrado',
                    frase + ' Te llevaremos a tu perfil.',
                    [
                        {
                            texto: 'Ir al perfil',
                            principal: true,
                            accion: function () {
                                irA(DESTINO_NO_ENCONTRADO);
                            }
                        },
                        {
                            texto: 'Intentar de nuevo',
                            accion: function () {
                                cerrarModal();
                                inClave.value = '';
                                inClave.focus();
                            }
                        }
                    ],
                    true,
                    ESPERA_NO_ENCONTRADO
                );

                timerRedireccion = setTimeout(function () {
                    irA(DESTINO_NO_ENCONTRADO);
                }, ESPERA_NO_ENCONTRADO);

            } else {
                console.error('Login falló:', respuesta.status, datos);

                abrirModal(
                    'error',
                    'No se pudo iniciar sesión',
                    textoDeError(datos, respuesta.status),
                    [
                        {
                            texto: 'Cerrar',
                            principal: true,
                            accion: cerrarModal
                        }
                    ],
                    false
                );

                setCargando(false);
            }

        } catch (error) {
            clearTimeout(espera);
            console.error('Error al iniciar sesión:', error);

            const aborto = error && error.name === 'AbortError';

            abrirModal(
                'error',
                aborto ? 'El servidor no responde' : 'Error de conexión',
                aborto
                    ? 'Pasaron ' + (ESPERA_SERVIDOR / 1000) + ' segundos sin respuesta. Comprueba que la aplicación ASP.NET esté ejecutándose.'
                    : 'No se pudo conectar con el servidor. Comprueba que la aplicación ASP.NET esté ejecutándose.',
                [
                    {
                        texto: 'Cerrar',
                        principal: true,
                        accion: cerrarModal
                    }
                ],
                false
            );

            setCargando(false);
        }
    });

    document.addEventListener('keydown', function (e) {
        if (
            e.key === 'Escape' &&
            overlay.classList.contains('abierto')
        ) {
            cerrarModal();
        }
    });
});