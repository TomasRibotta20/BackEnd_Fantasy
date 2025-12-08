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