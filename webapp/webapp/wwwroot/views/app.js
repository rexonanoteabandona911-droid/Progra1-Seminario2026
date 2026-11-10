var formActivo = "";

document.addEventListener("DOMContentLoaded", e => {
    let mnxAcademica = document.getElementById("mnxAcademica");
    if (mnxAcademica) {
        mnxAcademica.addEventListener("click", event => {
            event.preventDefault();
            let form = event.target.dataset.form;
            if (form) {
                abrirVentana(form);
            }
        });
    }
});

function abrirVentana(form) {
    let $ventana = $(`#${form}`); // #alumno, #materia, #docente, etc.
    if ($ventana.find("form").length > 0) {
        $ventana.show();
    } else {
        let url = `/views/${form}.html`;
        fetch(url)
            .then(resp => {
                if (!resp.ok) throw new Error("No se pudo cargar la vista");
                return resp.text();
            })
            .then(vista => {
                $ventana.html(vista).draggable();
                $ventana.show();
            })
            .catch(error => console.error("Error:", error));
    }
}
$(document).on('click', '.btn-close', function (e) {
    e.preventDefault();
    let formName = $(this).data('form') || $(this).closest('.position-absolute').attr('id');
    if (formName) {
        $(`#${formName}`).hide();
    } else {
        $(this).closest('.position-absolute').hide();
    }
});