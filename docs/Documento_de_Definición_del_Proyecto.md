# **Documento de Definición del Proyecto: Fantasy Liga Argentina**


## **1. Narrativa del Sistema**

El sistema consiste en una aplicación de gestión deportiva basada en el rendimiento real de los jugadores de la Liga Profesional de Fútbol Argentino (Temporada 2021). Los usuarios, se **registran<sup>1</sup>** en la plataforma para competir en **Torneos<sup>2</sup>**.

A diferencia de los Fantasy tradicionales( globales, el sistema se basa en un **ecosistema cerrado por Torneo**. Un usuario puede crear un torneo e invitar amigos mediante un código único. Dentro de cada torneo, **los jugadores son exclusivos**: si un usuario posee a un futbolista (ej. Julián Álvarez), ningún otro participante de ese mismo torneo puede tenerlo, fomentando la negociación, la estrategia y la suerte.

Al iniciar un torneo, el sistema realiza un **reparto inicial inteligente<sup>3</sup>** (Smart Pick). Asigna a cada participante una plantilla de 15 jugadores (11 titulares y 4 suplentes) seleccionados aleatoriamente pero balanceados mediante "calidad" (Oro, Plata, Bronce) basados en una **tasación<sup>4</sup>** histórica generada por Inteligencia Artificial. El sistema asegura que todos los equipos comiencen con una valoración de mercado equitativa y asigna un presupuesto inicial en moneda virtual (ej. $30.000.000) para futuras operaciones.

La gestión diaria permite a los usuarios **modificar su alineación<sup>5</sup>** (titulares/suplentes) respetando el esquema táctico. El **mercado de pases<sup>6</sup>** es el motor de la economía y presenta tres modalidades:



1. **Mercado de Agentes Libres (Subasta Ciega<sup>7</sup>):** Cada cierto tiempo, el admin  crea un mercado donde se pone a la venta jugadores que no pertenecen a nadie en el torneo. Los usuarios ofertan sin ver las pujas rivales y, al cierre del día, el mejor postor gana al jugador (siempre que tenga cupo y presupuesto).
2. **Transferencias directas<sup>8</sup>:** Los usuarios pueden negociar entre sí, enviando ofertas económicas por jugadores de otros equipos, las cuales pueden ser aceptadas o rechazadas.
3. **Cláusulas de Rescisión<sup>9</sup>:** Mecanismo de ejecución hostil donde un usuario paga el valor de salida de un jugador rival para ficharlo inmediatamente sin consentimiento del dueño, siempre que el jugador no se encuentre en "periodo de protección". Cada usuario puede elegir gastar parte de su presupuesto para subir el valor de cláusula de un jugador que considere importante o muy codiciado. 

El rendimiento de los jugadores en la vida real se traduce en **Puntos Fantasy** mediante un motor de cálculo que procesa estadísticas (goles, asistencias, vallas invictas, tarjetas) y calificaciones externas. Al finalizar cada jornada, se **calculan los puntajes<sup>10</sup>**, se **actualizan los precios de mercado<sup>11</sup>** de los jugadores en función de su rendimiento (oferta/demanda simulada por performance del jugador) y se otorgan **Recompensas<sup>12</sup>** (dinero o jugadores libres) a los ganadores de la fecha según su posición en la tabla.

El sistema además cuenta con la opción de elegir un modo automático, en el cual siempre que el servidor esté encendido, las tareas del administrador de procesar jornadas y abrir o cerrar mercados, serán realizadas automáticamente mediante cron jobs dependiendo de las fechas cargadas en la Base de datos.


---


## 2. Reglas de Negocio (RN)

### 1. Registro
* 1.1. Los usuarios se identifican por un nombre de usuario y correo electrónico único en el sistema. Además los mismos deberán proporcionar una contraseña que debe cumplir con una serie de reglas (Tener entre 6 y 100 caracteres y contener al menos una letra y un número).

### 2. Torneos
* 2.1. Los torneos tienen un límite de usuarios seteado por el admin, que por default está cargado en 5, es decir no puede haber más de 5 usuarios por torneos.
* 2.2. El usuario que cree el torneo tendrá el rol de "Creador" que le brinda ciertas capacidades como expulsar otros usuarios o iniciar el torneo.
* 2.3. Al crear un torneo el mismo indicará un código de acceso conformado por letras y números, y permanecerá en estado pendiente. El torneo permanecerá en estado pendiente hasta que el creador decida iniciarlo, luego de esto no se permitirán más accesos de nuevos usuarios.
* 2.4. Si un usuario es expulsado del torneo el mismo no podrá volver a unirse aunque el torneo no haya iniciado.

### 3. Reparto de Equipos
* 3.1. Los equipos de los jugadores solo tendrán una formación posible 4-3-3, que consiste de un arquero, 4 defensores, 3 mediocampistas y 3 delanteros. Junto con 4 jugadores en el banco de suplentes.
* 3.2. Al iniciar un torneo se realiza el reparto de jugadores de los equipos. Los mismos no pueden repetirse entre equipos del mismo torneo.
* 3.3. Cada equipo cuenta con un presupuesto inicial definido por el admin, que por default esta en 90 millones.
* 3.4. Los Equipos tienen un cupo de 15 jugadores sin discriminar por posición, de los cuales solo 11 pueden ser titulares al mismo tiempo (1 Arquero, 4 defensores, 3 mediocampistas y 3 delanteros).
* 3.5. A la hora de repartir los jugadores se siguen ciertas reglas para garantizar la competitividad de la aplicación.
    * 3.5.1. Cada equipo contará con un jugador estrella (Cuyo precio es mayor a 10 millones), y los demás titulares serán jugadores buenos (precio entre 3 a 8 millones), habrá un suplente por posición que serán jugadores no tan reconocidos (precio entre 500 mil a 2 millones).
    * 3.5.2. El valor de cada equipo quedará determinado por la suma de los precios de los 15 jugadores, y este en la asignación inicial estará entre 56 y 70 millones por equipo. Que se descuentan del presupuesto inicial de cada usuario, así el usuario que tenga un equipo más caro recibe menos presupuesto debido a su suerte y el más desfavorecido en el reparto inicial tendrá más presupuesto para comprar.

### 4. Precios Iniciales
* 4.1. El administrador será el encargado de ejecutar un comando para calcular los precios iniciales de todos los jugadores, mediante la API de Grok que tasará a los jugadores según su rendimiento anterior, posición, edad e importancia tanto nacional, como en su equipo.
* 4.2. Los Precios iniciales de los jugadores variarán entre 500.000 a 20.000.000 de la moneda del juego.
* 4.3. Cada club tendrá como máximo entre 2 a 3 jugadores con un precio mayor a 12.000.000.

### 5. Modificación de alineación
* 5.1. El usuario podrá vender jugadores de su equipo instantáneamente al mercado, por un 70 por ciento del valor de mercado actual del jugador elegido.
* 5.2. El usuario tendrá la posibilidad de cambiar entre titulares y suplentes para elegir los jugadores que más crea convenientes para sumar puntos, ya que los puntos de los suplentes no cuentan para el cálculo de puntos total por equipo.

### 6. Mercado de Pases
* 6.1. En el momento que se inicia el torneo, se crea el primer mercado de pases, para que los usuarios puedan comprar jugadores al mercado.
* 6.2. Al momento de crear el mercado de pases se crea un pool con jugadores que no están seleccionados para ninguno de los equipos del torneo, es decir jugadores "libres". Al momento de abrir cada mercado se eligen X jugadores aleatorios de este pool de jugadores. Esto se realiza para que los jugadores no se repitan entre mercado, y si un usuario quiere a un jugador específico este saldrá en algún momento a la venta al mercado.
* 6.3. Cuando todos los jugadores del pool de jugadores libres ya aparecieron en al menos un mercado, el pool se reinicia y comienza todo nuevamente.
* 6.4. Si un usuario vende a un jugador al mercado este solo se sumará al pool de jugadores libres solo en el caso de que no haya aparecido en algún mercado anterior.
* 6.5. Los mercados deben ser cerrados por el administrador y predeterminadamente están pensados para que duren 1 día. Al cerrar el mercado se asignan los jugadores a los respectivos ganadores de las pujas.

### 7. Compra al Mercado: Subasta Ciega
* 7.1. Todos los usuarios podrán ver los jugadores que pertenecen al mercado y realizar una puja por el valor de mercado del jugador o un precio superior.
* 7.2. Los usuarios tendrán la posibilidad de ver la cantidad de pujas por el mismo jugador, pero no sabrán quienes las realizaron ni los montos realizados. Este método es para que cada usuario ponga el valor máximo que esté dispuesto a pagar.
* 7.3. Al cerrar el mercado el sistema se encargará de asignarle los jugadores a los usuarios ganadores, para ello primeramente verifica cual fue el usuario que más ofertó por el jugador y luego verifica que tenga el cupo en su plantilla para obtener el jugador.
* 7.4. Si dos usuarios ofertan el mismo monto por un jugador y ambos tienen cupos, se llevará el jugador el primero que hizo la oferta.
* 7.5. En caso de que un usuario no tenga cupo para el jugador, el mismo será asignado al segundo mejor postor y en caso de que sea el único usuario que ofertó por el jugador, este no será asignado a nadie.

### 8. Ofertas entre jugadores
* 8.1. Los usuarios tendrán la posibilidad de visualizar los equipos de otros usuarios de su mismo torneo y realizar una oferta a cualquiera de los jugadores de estos equipos.
* 8.2. La oferta debe ser mínimamente por el precio de mercado del jugador a ofertar y como máximo el presupuesto del oferente.
* 8.3. El oferente puede cancelar una oferta en cualquier momento.
* 8.4. El Receptor tiene la posibilidad de rechazar la oferta o aceptarla y vender su jugador al oferente recibiendo el monto acordado.
* 8.5. El oferente en caso de que considere necesario puede actualizar la oferta y ofertar menos o más dinero por el jugador.
* 8.6. Si el oferente no tiene cupos en el momento que el receptor elige aceptar la oferta, le avisará al receptor y no lo dejará aceptar completamente la misma.

### 9. Cláusulas de rescisión
* 9.1. Todos los jugadores tienen una cláusula de rescisión que mínimamente es su valor de mercado.
* 9.2. Los usuarios pueden aumentar el valor de la cláusula a sus jugadores más codiciados por otros equipos utilizando dinero de su presupuesto. Predeterminadamente por cada unidad de moneda del juego se aumentan 2 unidades de valor de cláusula de un jugador.
* 9.3. Los jugadores tienen un periodo en el cual la cláusula no puede ser ejecutada. Esto está pensado para que no sucedan ejecuciones de cláusulas consecutivas o circulares en un corto periodo de tiempo. Este periodo predeterminadamente es de 2 días luego de que ese jugador se incorporó al equipo. En el momento de asignación de equipos, los jugadores tienen ese día como su fecha de incorporación.
* 9.4. A la hora de ejecutar una cláusula el usuario ejecutante debe tener cupo en su equipo, de lo contrario no le permitirá realizar la operación.

### 10. Cálculo de puntos
* 10.1. Cuando la jornada finalizó el administrador o el sistema automático se encarga de ejecutar el código para traer de la api externa todos los datos de cada jugador que exista en el sistema. De cada jugador se obtienen los siguientes datos: Cantidad de minutos jugados, rating otorgado por la API externa, Si fue capitán o no, Goles, Asistencias, Goles Concedidos y atajadas en caso de ser arquero, tarjetas amarillas, tarjetas rojas, y si terminó el partido sin que su equipo conceda un gol.
* 10.2. Con los datos de cada jugador el sistema calcula un puntaje para la jornada basado en las siguientes reglas:
    * 10.2.1. Si el jugador juega más de 60 minutos se le sumará 1 punto.
    * 10.2.2. Si el jugador convierte un gol se le sumarán 6, 5 o 4 puntos dependiendo si es Arquero/Defensor, mediocampista o delantero respectivamente.
    * 10.2.3. Si el jugador brinda una asistencia se le sumarán 3 puntos independientemente de la posición.
    * 10.2.4. Si el equipo no concede goles se le sumarán 4 puntos a los arqueros y defensores que hayan jugado más de 60 minutos.
    * 10.2.5. Si el jugador recibe 1 tarjeta amarilla se le restará 2 puntos.
    * 10.2.6. Si el jugador es expulsado con tarjeta roja se le restará 5 puntos.
    * 10.2.7. A la sumatoria de todos los puntos anteriores, se le agregará el rating otorgado por la API externa para conformar el puntaje final.
    * 10.2.8. El puntaje no puede ser negativo.
    * 10.2.9. Al usuario solo le sumarán puntos para la competencia del torneo, de jugadores titulares.
* 10.3. Existen partidos sin datos en la API externa, en este caso se le colocará un 0 de puntuación a los jugadores que pertenecen a ambos equipos de ese partido.

### 11. Actualización de Precios por rendimiento
* 11.1. Luego de calcular el puntaje de cada jugador el sistema actualizará el precio del mismo dependiendo de dos cosas: Los puntos obtenidos por el jugador y la tendencia en las últimas 3 jornadas.
* 11.2. Para calcular la actualización dependiendo de los puntos obtenidos en la jornada se siguen las siguientes reglas:
    * 11.2.1. Si el jugador saca 1 punto o menos, recibe una baja del 10% en su precio.
    * 11.2.2. Si el jugador saca 3 puntos o menos, recibe una baja del 5% en su precio.
    * 11.2.3. Si el jugador saca 5 puntos o menos, recibe una baja del 3% en su precio.
    * 11.2.4. Si el jugador saca 6 puntos o menos, su precio se mantiene igual.
    * 11.2.5. Si el jugador saca 7 puntos o menos, recibe una suba del 3% en su precio.
    * 11.2.6. Si el jugador saca 8 puntos o menos, recibe una suba del 5% en su precio.
    * 11.2.7. Si el jugador saca 9 puntos o menos, recibe una suba del 10% en su precio.
    * 11.2.8. Si el jugador saca 11 puntos o menos, recibe una suba del 15% en su precio.
    * 11.2.9. Si el jugador saca 14 puntos o menos, recibe una suba del 20% en su precio.
    * 11.2.10. Si el jugador saca 14 puntos o más, recibe una suba del 25% en su precio.
* 11.3. Para calcular la actualización dependiendo de la tendencia de puntos en las últimas 3 jornadas se siguen las siguientes reglas:
    * 11.3.1. Si el jugador tiene una tendencia ascendente en las últimas 3 jornadas (p1>p2>p3), recibe una suba del 4% en su precio.
    * 11.3.2. Si el jugador tiene una tendencia descendente en las últimas 3 jornadas (p1<p2<p3), recibe una baja del 4% en su precio.
    * 11.3.3. Si los últimos 3 partidos de un jugador tienen 12 puntos o más, recibe una suba del 10% en su precio.
    * 11.3.4. Si el jugador no tiene más de 12 puntos en los últimos 3 partidos, pero tiene más de 8 en cada uno, recibe una suba del 6% en su precio.
    * 11.3.5. Si el jugador tiene al menos un puntaje menor a 6 y la diferencia entre el puntaje máximo y mínimo en esas 3 fechas es mayor o igual a 7 puntos, recibe una baja del 3% en su precio.
    * 11.3.6. Si en las dos jornadas más antiguas de las 3 el jugador tiene un puntaje menor a 5 y en la tercera tiene un puntaje igual o mayor a 8 puntos, recibe una suba del 2%.
    * 11.3.7. Si en las dos jornadas más antiguas de las 3 el jugador tiene un puntaje mayor o igual a 8 y en la tercera tiene un puntaje menor a 5 puntos, recibe una baja del 5%.
    * 11.3.8. Los modificadores de tendencia pueden acumularse en el caso de que no sean excluyentes. Son excluyentes entre sí: 11.3.1 y 11.3.2; 11.3.3 y 11.3.4; y 11.3.6 con 11.3.7.
* 11.4. Los modificadores de tendencia solo se aplican si el jugador tiene al menos 3 jornadas con puntos.
* 11.5. Una vez calculados ambos modificadores, estos se suman y determinan el modificador de precio final.

### 12. Recompensas
* 12.1. Luego de calcular los puntos para cada equipo de cada usuario, se hace una tabla de puntos en la cual, dependiendo de quién sacó más puntos, se reparten recompensas monetarias y de jugadores. Cada recompensa tiene distintas opciones de **premios<sup>13</sup>** según la posicion en la que quedó el usuario en la tabla de puntos previamente calculada. Para el usuario que queda primero en el ranking final de esa jornada se le otorgará una recompensa de tier oro. Si queda segundo o tercero recibirá una recompensa de tier plata. Si queda cuarto o quinto recibirá una recompensa de tier bronce. Las recompensas se pueden reclamar en el transcurso de la jornada, es decir, si se procesa la jornada siguiente toda recompensa es auto-reclamada y se le otorgará un saldo en efectivo, según el tier de la recompensa, al equipo del usuario.

### 13. Premios
* 13.1. Los premios están definidos por tipo (ruleta, saldo, player pick). La ruleta sortea aleatoreamente un jugador y se lo transfiere instantáneamente al equipo del usuario que reclamó esa recompensa. El saldo asigna un monto en "efectivo" al equipo del usuario. El player pick te da a elegir entre 3 jugadores, sorteados aleatoreamente, y se asigna solo uno al equipo del usuario (pasados cinco minutos, el sorteo expira). Cada premio tiene además uno o varios tiers a los que pertenece, por ejemplo, la ruleta puede ser de tier oro y tier plata pero no existe una ruleta de tier bronce. Los premios mejoran en base al tier. Una ruleta tier oro tendrá mejores recompensas que una de tier plata.

---

## 3. Casos de Uso (Detallados)
A continuación, se describen algunos de los flujos más importantes de la aplicación siguiendo los estándares para escribir un caso de uso.

### CU-001 Crear e Iniciar Torneo
* **Meta:** Crear un nuevo torneo, reunir a los participantes e iniciar la competencia con el reparto inicial.
* **Actor principal:** Usuario (Creador). Otros actores: Usuario (Participante).
* **Precondiciones de negocio:** El Usuario posee una cuenta registrada.
* **Precondiciones de sistema:** Existen jugadores registrados con precios asignados en la base de datos.
* **Disparador:** El Usuario decide crear un nuevo torneo de fantasy.
* **Camino básico:**
    1. El Usuario ingresa los datos del torneo y su equipo. El Sistema valida los límites de configuración global, genera un código de acceso único, registra el torneo con estado EN_ESPERA y registra al Usuario como creador.
    2. Cuando otros Usuarios ingresaron el código de acceso, el Sistema valida las condiciones de inscripción (cupo disponible, equipo no duplicado), registra a los participantes y les asocia un equipo.
    3. Cuando el Usuario Creador decidió iniciar el torneo, el Sistema valida que existan al menos 2 participantes, asigna 15 jugadores aleatorios balanceados a cada equipo, ajusta los presupuestos iniciales, actualiza el estado del torneo a ACTIVO y abre el primer mercado de agentes libres.
* **Caminos alternativos:**
    * 2.a. <Durante> Torneo lleno o Usuario ya inscrito detectado:
        * 2.a.1. El Sistema informa el error de inscripción.
        * 2.a.2. FCU.
* **Post-condiciones de negocio:**
    * Éxito: El torneo comenzó formalmente con todos los equipos armados y el mercado activo.
    * Éxito alternativo: <Omitido>
    * Fracaso: El torneo quedó en espera por falta de participantes o errores de cupo.
* **Post-condiciones de sistema:**
    * Éxito: El torneo está registrado con estado ACTIVO. Los equipos están registrados con sus 15 jugadores asociados y presupuestos actualizados. El primer MercadoDiario está registrado con estado ABIERTO.
    * Éxito alternativo: <vacío>
    * Fracaso: <vacío>

### CU-002 Realizar Puja en Mercado (Subasta Ciega)
* **Meta:** Ofertar por un jugador libre en el mercado diario del torneo.
* **Actor principal:** Usuario (Comprador). Otros actores: Administrador (o sistema automático).
* **Precondiciones de negocio:** Existe un mercado diario abierto para el torneo.
* **Precondiciones de sistema:** Existe un MercadoDiario con estado ABIERTO y el Usuario posee presupuesto disponible.
* **Disparador:** El Usuario decide realizar una puja por un jugador del mercado.
* **Camino básico:**
    1. El Usuario selecciona un jugador del mercado e ingresa el monto de su puja. El Sistema valida las condiciones de la puja (vigencia del mercado, monto mínimo y presupuesto disponible), bloquea el monto en el presupuesto del Usuario y registra la puja con estado PENDIENTE.
    2. Cuando el Administrador decidió cerrar el mercado, el Sistema evalúa las pujas pendientes agrupadas por jugador. El Sistema valida el cupo de la plantilla del mayor postor, transfiere el jugador al equipo ganador, descuenta definitivamente el presupuesto bloqueado del ganador, libera el presupuesto bloqueado de los perdedores y registra el mercado como CERRADO.
* **Caminos alternativos:**
    * 1.a. <Durante> Presupuesto insuficiente detectado:
        * 1.a.1. El Sistema informa que los fondos no cubren la oferta.
        * 1.a.2. FCU.
    * 2.a. <Durante> Cupo de plantilla lleno del ganador detectado (al cerrar mercado):
        * 2.a.1. El Sistema rechaza la puja ganadora, libera sus fondos y asigna el jugador al siguiente postor con mayor monto.
* **Post-condiciones de negocio:**
    * Éxito: El Usuario ganó la subasta ciega y fichó al jugador.
    * Éxito alternativo: El Usuario perdió la subasta y su dinero fue devuelto.
    * Fracaso: La puja no se concretó por falta de fondos.
* **Post-condiciones de sistema:**
    * Éxito: La puja está registrada con estado GANADA. El jugador está registrado en el nuevo equipo. Las transacciones económicas están registradas y el mercado está registrado como CERRADO.
    * Éxito alternativo: La puja está registrada como PERDIDA y el presupuesto bloqueado está liberado.
    * Fracaso: <vacío>

### CU-003 Procesar Jornada
* **Meta:** Cerrar una fecha calculando puntajes, actualizando precios de jugadores y generando recompensas.
* **Actor principal:** Administrador. Otros actores: Ninguno.
* **Precondiciones de negocio:** La jornada contiene partidos finalizados y las modificaciones de equipos están deshabilitadas.
* **Precondiciones de sistema:** Existe una jornada registrada en la configuración global.
* **Disparador:** El Administrador decide procesar la jornada actual.
* **Camino básico:**
    1. El Administrador ingresa la orden de procesar jornada. El Sistema valida el estado de la jornada y crea un snapshot (copia estática) de las alineaciones titulares de todos los equipos.
    2. Cuando el Sistema guardó los snapshots, el Sistema obtiene las estadísticas de los jugadores desde la API externa y calcula el puntaje individual de cada futbolista.
    3. Cuando el Sistema calculó los puntajes individuales, el Sistema suma los puntos de los jugadores titulares para obtener el puntaje total de cada equipo.
    4. Cuando el Sistema obtuvo los puntajes de los equipos, el Sistema actualiza los precios de mercado de los jugadores aplicando los modificadores de rendimiento y tendencia, genera las recompensas económicas según el ranking de la jornada y actualiza la configuración global activando la jornada siguiente.
* **Caminos alternativos:**
    * 1.a. <Durante> Modificaciones de equipos habilitadas detectadas:
        * 1.a.1. El Sistema informa que deben deshabilitarse las modificaciones antes de procesar.
        * 1.a.2. FCU.
* **Post-condiciones de negocio:**
    * Éxito: La jornada se cerró, los puntos fueron asignados, los jugadores variaron su precio y se repartieron los premios.
    * Éxito alternativo: <Omitido>
    * Fracaso: La jornada no fue procesada por no cumplir precondiciones.
* **Post-condiciones de sistema:**
    * Éxito: Los puntajes están registrados en EstadísticasJugador. Los historiales de precios están actualizados. Las Recompensas están registradas asociadas a los equipos. El GameConfig indica la nueva jornada activa.
    * Éxito alternativo: <vacío>
    * Fracaso: <vacío>

### CU-004 Realizar Oferta de Compra Directa
* **Meta:** Adquirir un jugador de otro participante del mismo torneo mediante negociación directa.
* **Actor principal:** Usuario (Oferente). Otros actores: Usuario (Vendedor).
* **Precondiciones de negocio:** Ambos usuarios participan activamente en el mismo torneo.
* **Precondiciones de sistema:** El jugador objetivo está asociado al equipo del vendedor.
* **Disparador:** El Usuario Oferente decide enviar una oferta económica por un jugador rival.
* **Camino básico:**
    1. El Usuario Oferente selecciona al jugador rival e ingresa el monto. El Sistema valida las reglas de transferencia (presupuesto suficiente, no auto-oferta), bloquea preventivamente el monto en el presupuesto del oferente, emite una notificación al vendedor y registra la oferta con estado PENDIENTE.
    2. Cuando el Usuario Vendedor decidió aceptar la oferta, el Sistema valida la vigencia de la oferta y el cupo del comprador. El Sistema transfiere el jugador, transfiere el dinero al vendedor, rechaza automáticamente ofertas competidoras por el mismo jugador y registra las transacciones.
* **Caminos alternativos:**
    * 1.a. <Durante> Presupuesto insuficiente detectado:
        * 1.a.1. El Sistema informa el error de fondos.
        * 1.a.2. FCU.
    * 2.a. <Previo> El Usuario Vendedor decidió rechazar la oferta:
        * 2.a.1. El Usuario Vendedor ingresa la orden de rechazo. El Sistema desbloquea los fondos del oferente, marca la oferta como RECHAZADA y notifica al oferente.
        * 2.a.2. FCU.
    * 2.b. <Previo> El Usuario Oferente decidió cancelar la oferta:
        * 2.b.1. El Sistema desbloquea los fondos y marca la oferta como CANCELADA.
        * 2.b.2. FCU.
* **Post-condiciones de negocio:**
    * Éxito: La transferencia se completó de mutuo acuerdo.
    * Éxito alternativo: La transferencia se canceló o rechazó y el dinero fue devuelto.
    * Fracaso: La oferta inicial no se emitió por falta de fondos.
* **Post-condiciones de sistema:**
    * Éxito: La oferta está registrada con estado ACEPTADA. El jugador está registrado en el equipo comprador. Los presupuestos están actualizados. Las ofertas competidoras están registradas como RECHAZADAS.
    * Éxito alternativo: La oferta está registrada como RECHAZADA/CANCELADA y los fondos bloqueados están liberados.
    * Fracaso: <vacío>

### CU-005 Blindar Cláusula de Jugador
* **Meta:** Incrementar la cláusula de rescisión de un jugador propio para protegerlo de compras hostiles.
* **Actor principal:** Usuario (Propietario). Otros actores: Ninguno.
* **Precondiciones de negocio:** El jugador pertenece al equipo del Usuario.
* **Precondiciones de sistema:** Existen equipos registrados con jugadores asociados y presupuesto disponible.
* **Disparador:** El Usuario decide invertir parte de su presupuesto en aumentar la cláusula de uno de sus jugadores.
* **Camino básico:**
    1. El Usuario selecciona un jugador de su plantilla e ingresa el monto de incremento deseado. El Sistema valida la propiedad del jugador, calcula el costo del blindaje según el ratio de configuración global y valida que el presupuesto del equipo cubra dicho costo.
    2. Cuando el Sistema validó los fondos, el Sistema suma el incremento a la cláusula actual, descuenta el costo del presupuesto del Usuario, registra la transacción de gasto y muestra los nuevos valores actualizados al Usuario.
* **Caminos alternativos:**
    * 1.a. <Durante> Presupuesto insuficiente detectado:
        * 1.a.1. El Sistema informa el costo requerido y el presupuesto disponible.
        * 1.a.2. FCU.
* **Post-condiciones de negocio:**
    * Éxito: El jugador quedó protegido con una cláusula de salida más alta a costa del presupuesto del usuario.
    * Éxito alternativo: <Omitido>
    * Fracaso: El blindaje no se realizó por falta de fondos.
* **Post-condiciones de sistema:**
    * Éxito: El valor de la cláusula del jugador está actualizado. La transacción de GASTO_BLINDAJE está registrada. El presupuesto del equipo está actualizado.
    * Éxito alternativo: <vacío>
    * Fracaso: <vacío>

### CU-006 Ejecutar Cláusula de Rescisión
* **Meta:** Fichar forzosamente a un jugador rival pagando el valor total de su cláusula de salida.
* **Actor principal:** Usuario (Comprador). Otros actores: Usuario (Vendedor).
* **Precondiciones de negocio:** El jugador pertenece a un equipo rival del mismo torneo y no se encuentra en período de protección.
* **Precondiciones de sistema:** Existen equipos registrados con jugadores asociados en un torneo activo y las modificaciones están habilitadas.
* **Disparador:** El Usuario decide ejecutar la cláusula de salida de un jugador rival.
* **Camino básico:**
    1. El Usuario selecciona un jugador rival e ingresa la orden de ejecutar la cláusula. El Sistema valida las reglas de disponibilidad (que el jugador no esté en período de protección) y calcula el precio de salida actual.
    2. Cuando el Sistema calculó el precio, el Sistema valida que el presupuesto del Usuario comprador sea suficiente para cubrir el costo y que posea cupo disponible en su plantilla.
    3. Cuando el Usuario confirmó el pago, el Sistema descuenta el precio de salida al comprador, suma el importe al vendedor, transfiere la titularidad del jugador al comprador, reinicia el período de protección del jugador, resetea su blindaje a cero, registra las transacciones económicas y emite correos de notificación a ambos usuarios.
* **Caminos alternativos:**
    * 1.a. <Durante> Jugador en período de protección detectado:
        * 1.a.1. El Sistema informa los días de inmunidad restantes del jugador.
        * 1.a.2. FCU.
    * 2.a. <Durante> Presupuesto insuficiente o cupo de plantilla lleno detectado:
        * 2.a.1. El Sistema informa el error correspondiente que impide la transferencia.
        * 2.a.2. FCU.
* **Post-condiciones de negocio:**
    * Éxito: El comprador fichó al jugador forzosamente y el vendedor recibió el dinero de compensación.
    * Éxito alternativo: <Omitido>
    * Fracaso: La ejecución no se concretó por incumplir las reglas de negocio (protección, cupo o dinero).
* **Post-condiciones de sistema:**
    * Éxito: El jugador está registrado en el equipo comprador con su fecha de incorporación actualizada y cláusula en cero. Las transacciones de PAGO_CLAUSULA y COBRO_CLAUSULA están registradas. Los presupuestos de ambos equipos están actualizados.
    * Éxito alternativo: <vacío>
    * Fracaso: <vacío>
