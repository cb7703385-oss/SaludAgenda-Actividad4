# SaludAgenda

Prototipo académico de una agenda web para consultorios médicos. Permite registrar citas, buscarlas, confirmarlas y cancelarlas. Los datos quedan guardados en el almacenamiento local del navegador; no se envía información a un servidor.

## Uso

Abre `index.html` en un navegador moderno. No requiere instalar programas ni configurar una base de datos.

## Historias de usuario implementadas

1. Como usuario, quiero crear una cuenta e iniciar sesión para acceder a la agenda.
2. Como paciente, quiero registrar una cita indicando especialidad, profesional, fecha y hora.
3. Como personal del consultorio, quiero confirmar citas pendientes para actualizar su estado.
4. Como personal del consultorio, quiero cancelar citas para mantener la agenda actualizada.
5. Como consultorio, quiero evitar dos citas del mismo profesional a la misma hora para prevenir cruces en la agenda.

La plataforma también permite consultar y buscar citas, ver las consultas anteriores y agregar expedientes médicos con diagnóstico, tratamiento y observaciones.

## Consideraciones

Es una demostración académica: las cuentas, citas y expedientes se guardan localmente en el navegador y no se sincronizan entre dispositivos ni se envían a un servidor. No debe utilizarse para almacenar información clínica real.
