import { transporter } from './mailer.js';

/**
 * Email cuando un usuario recibe una oferta
 */
export async function sendOfertaRecibidaEmail(
  to: string,
  username: string,
  jugadorNombre: string,
  monto: number,
  equipoOferente: string,
  usuarioOferente: string,
  torneoNombre: string,
  mensaje?: string,
  esActualizacion: boolean = false
) {
  const subject = esActualizacion 
    ? `[${torneoNombre}] Oferta actualizada por ${jugadorNombre}`
    : `[${torneoNombre}] Nueva oferta por ${jugadorNombre}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${esActualizacion ? ' Oferta Actualizada' : ' Nueva Oferta de Compra'}</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>${esActualizacion ? 'Se ha actualizado' : 'Has recibido'} una oferta por tu jugador en el torneo <strong>${torneoNombre}</strong>:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong> Jugador:</strong> ${jugadorNombre}</p>
        <p><strong> Monto ofertado:</strong> $${monto.toLocaleString()}</p>
        <p><strong> Torneo:</strong> ${torneoNombre}</p>
        <p><strong> Usuario:</strong> ${usuarioOferente}</p>
        <p><strong> Equipo:</strong> ${equipoOferente}</p>
        ${mensaje ? `<p><strong> Mensaje:</strong> ${mensaje}</p>` : ''}
      </div>

      <p>Tienes <strong>48 horas</strong> para aceptar o rechazar esta oferta.</p>
      
      <p style="margin-top: 30px;">
        <a href="http://localhost:5173/mis-ofertas" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver Ofertas
        </a>
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Este es un correo automático del sistema Fantasy Football. Por favor no respondas a este correo.
      </p>
    </div>
  `;

  try {
    if (process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: '"Fantasy Football" <arielmazalan15@gmail.com>',
        to,
        subject,
        html
      });
      console.log(` Email de oferta enviado a ${to}`);
    } else {
      console.log(` [DEMO] Email de oferta para ${to}: ${jugadorNombre} - $${monto.toLocaleString()} en ${torneoNombre}`);
    }
  } catch (error) {
    console.error(' Error enviando email de oferta:', error);
  }
}

/**
 * Email cuando aceptan tu oferta
 */
export async function sendOfertaAceptadaEmail(
  to: string,
  username: string,
  jugadorNombre: string,
  monto: number,
  equipoVendedor: string,
  usuarioVendedor: string,
  torneoNombre: string
) {
  const subject = `[${torneoNombre}]  Tu oferta por ${jugadorNombre} fue aceptada!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;"> ¡Oferta Aceptada!</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>¡Excelentes noticias! Tu oferta ha sido aceptada en el torneo <strong>${torneoNombre}</strong>:</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p><strong> Jugador adquirido:</strong> ${jugadorNombre}</p>
        <p><strong> Precio pagado:</strong> $${monto.toLocaleString()}</p>
        <p><strong> Torneo:</strong> ${torneoNombre}</p>
        <p><strong> Usuario vendedor:</strong> ${usuarioVendedor}</p>
        <p><strong> Equipo vendedor:</strong> ${equipoVendedor}</p>
      </div>

      <p>El jugador ya está en tu equipo. ¡Éxitos con tu nueva adquisición!</p>
      
      <p style="margin-top: 30px;">
        <a href="http://localhost:5173/mi-equipo" 
           style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver Mi Equipo
        </a>
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Este es un correo automático del sistema Fantasy Football. Por favor no respondas a este correo.
      </p>
    </div>
  `;

  try {
    if (process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: '"Fantasy Football" <arielmazalan15@gmail.com>',
        to,
        subject,
        html
      });
      console.log(` Email de aceptación enviado a ${to}`);
    } else {
      console.log(` [DEMO] Email de aceptación para ${to}: ${jugadorNombre} aceptado en ${torneoNombre}`);
    }
  } catch (error) {
    console.error(' Error enviando email de aceptación:', error);
  }
}

/**
 * Email cuando rechazan tu oferta
 */
export async function sendOfertaRechazadaEmail(
  to: string,
  username: string,
  jugadorNombre: string,
  monto: number,
  equipoVendedor: string,
  usuarioVendedor: string,
  torneoNombre: string,
  mensajeRechazo?: string
) {
  const subject = `[${torneoNombre}]  Tu oferta por ${jugadorNombre} fue rechazada`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;"> Oferta Rechazada</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Lamentamos informarte que tu oferta ha sido rechazada en el torneo <strong>${torneoNombre}</strong>:</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p><strong> Jugador:</strong> ${jugadorNombre}</p>
        <p><strong> Monto ofertado:</strong> $${monto.toLocaleString()}</p>
        <p><strong> Torneo:</strong> ${torneoNombre}</p>
        <p><strong> Usuario vendedor:</strong> ${usuarioVendedor}</p>
        <p><strong> Equipo vendedor:</strong> ${equipoVendedor}</p>
        ${mensajeRechazo ? `<p><strong> Mensaje del vendedor:</strong> ${mensajeRechazo}</p>` : ''}
      </div>

      <p>El dinero bloqueado ha sido liberado y está disponible en tu presupuesto.</p>
      <p>Puedes intentar con otro jugador o hacer una nueva oferta más adelante.</p>
      
      <p style="margin-top: 30px;">
        <a href="http://localhost:5173/mercado" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Buscar Jugadores
        </a>
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Este es un correo automático del sistema Fantasy Football. Por favor no respondas a este correo.
      </p>
    </div>
  `;

  try {
    if (process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: '"Fantasy Football" <arielmazalan15@gmail.com>',
        to,
        subject,
        html
      });
      console.log(` Email de rechazo enviado a ${to}`);
    } else {
      console.log(` [DEMO] Email de rechazo para ${to}: ${jugadorNombre} rechazado en ${torneoNombre}`);
    }
  } catch (error) {
    console.error(' Error enviando email de rechazo:', error);
  }
}

/**
 * Email cuando vence una oferta
 */
export async function sendOfertaVencidaEmail(
  to: string,
  username: string,
  jugadorNombre: string,
  monto: number,
  torneoNombre: string
) {
  const subject = `[${torneoNombre}]  Tu oferta por ${jugadorNombre} ha vencido`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;"> Oferta Vencida</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Tu oferta ha vencido sin recibir respuesta en el torneo <strong>${torneoNombre}</strong>:</p>
      
      <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p><strong> Jugador:</strong> ${jugadorNombre}</p>
        <p><strong> Monto ofertado:</strong> $${monto.toLocaleString()}</p>
        <p><strong> Torneo:</strong> ${torneoNombre}</p>
      </div>

      <p>El dinero bloqueado ha sido liberado y está disponible en tu presupuesto.</p>
      <p>Puedes hacer una nueva oferta si el jugador sigue disponible.</p>
      
      <p style="margin-top: 30px;">
        <a href="http://localhost:5173/mercado" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Buscar Jugadores
        </a>
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Este es un correo automático del sistema Fantasy Football. Por favor no respondas a este correo.
      </p>
    </div>
  `;

  try {
    if (process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: '"Fantasy Football" <arielmazalan15@gmail.com>',
        to,
        subject,
        html
      });
      console.log(` Email de vencimiento enviado a ${to}`);
    } else {
      console.log(` [DEMO] Email de vencimiento para ${to}: ${jugadorNombre} vencido en ${torneoNombre}`);
    }
  } catch (error) {
    console.error(' Error enviando email de vencimiento:', error);
  }
}

/**
 * Email cuando te ejecutan una cláusula (te roban un jugador)
 */
export async function sendClausulaEjecutadaEmail(
  to: string,
  username: string,
  jugadorNombre: string,
  jugadorPosicion: string,
  montoRecibido: number,
  equipoComprador: string,
  usuarioComprador: string,
  torneoNombre: string,
  presupuestoNuevo: number
) {
  const subject = `[${torneoNombre}]  ¡Te han ejecutado una cláusula!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;"> ¡Cláusula Ejecutada!</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Te informamos que <strong>${usuarioComprador}</strong> ha ejecutado la cláusula de tu jugador en el torneo <strong>${torneoNombre}</strong>:</p>
      
      <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p><strong> Jugador:</strong> ${jugadorNombre}</p>
        <p><strong> Posición:</strong> ${jugadorPosicion}</p>
        <p><strong> Monto recibido:</strong> $${montoRecibido.toLocaleString()}</p>
        <p><strong> Torneo:</strong> ${torneoNombre}</p>
        <p><strong> Usuario comprador:</strong> ${usuarioComprador}</p>
        <p><strong> Equipo comprador:</strong> ${equipoComprador}</p>
      </div>

      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p style="margin: 0;"><strong>💵 Tu nuevo presupuesto:</strong> $${presupuestoNuevo.toLocaleString()}</p>
      </div>

      <p>El dinero de la cláusula ya está disponible en tu presupuesto. ¡Aprovecha para fichar nuevos talentos!</p>
      
      <p style="margin-top: 30px;">
        <a href="http://localhost:5173/mercado" 
           style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
           Buscar Jugadores
        </a>
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Este es un correo automático del sistema Fantasy Football. Por favor no respondas a este correo.
      </p>
    </div>
  `;

  try {
    if (process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: '"Fantasy Football" <arielmazalan15@gmail.com>',
        to,
        subject,
        html
      });
      console.log(` Email de cláusula ejecutada enviado a ${to}`);
    } else {
      console.log(` [DEMO] Email de cláusula para ${to}: ${jugadorNombre} clausulado por ${usuarioComprador} en ${torneoNombre}`);
    }
  } catch (error) {
    console.error(' Error enviando email de cláusula ejecutada:', error);
  }
}

/**
 * Email cuando ejecutas exitosamente una cláusula (compras un jugador)
 */
export async function sendClausulaExitosaEmail(
  to: string,
  username: string,
  jugadorNombre: string,
  jugadorPosicion: string,
  montoPagado: number,
  equipoVendedor: string,
  usuarioVendedor: string,
  torneoNombre: string,
  presupuestoRestante: number,
  fechaProteccionHasta: Date
) {
  const subject = `[${torneoNombre}]  ¡Clausulazo exitoso! ${jugadorNombre} es tuyo`;

  const fechaFormateada = fechaProteccionHasta.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;"> ¡Clausulazo Exitoso!</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>¡Felicitaciones! Has ejecutado exitosamente la cláusula de un jugador en el torneo <strong>${torneoNombre}</strong>:</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p><strong> Jugador adquirido:</strong> ${jugadorNombre}</p>
        <p><strong> Posición:</strong> ${jugadorPosicion}</p>
        <p><strong> Precio pagado:</strong> $${montoPagado.toLocaleString()}</p>
        <p><strong> Torneo:</strong> ${torneoNombre}</p>
        <p><strong> Usuario vendedor:</strong> ${usuarioVendedor}</p>
        <p><strong> Equipo vendedor:</strong> ${equipoVendedor}</p>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0;"><strong> Protección:</strong> Este jugador está protegido hasta el <strong>${fechaFormateada}</strong></p>
      </div>

      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0;"><strong> Presupuesto restante:</strong> $${presupuestoRestante.toLocaleString()}</p>
      </div>

      <p>El jugador ya está en tu equipo como suplente. Puedes modificar tu alineación cuando lo desees.</p>
      <p><strong>Recuerda:</strong> Durante el período de protección, nadie podrá ejecutar la cláusula de este jugador.</p>
      
      <p style="margin-top: 30px;">
        <a href="http://localhost:5173/mi-equipo" 
           style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
           Ver Mi Equipo
        </a>
      </p>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Este es un correo automático del sistema Fantasy Football. Por favor no respondas a este correo.
      </p>
    </div>
  `;

  try {
    if (process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: '"Fantasy Football" <arielmazalan15@gmail.com>',
        to,
        subject,
        html
      });
      console.log(` Email de clausulazo exitoso enviado a ${to}`);
    } else {
      console.log(` [DEMO] Email de clausulazo exitoso para ${to}: ${jugadorNombre} adquirido de ${usuarioVendedor} en ${torneoNombre}`);
    }
  } catch (error) {
    console.error(' Error enviando email de clausulazo exitoso:', error);
  }
}