const emailUser     = process.env.EMAIL_USER
const emailPassword = process.env.EMAIL_PASSWORD

/**
 * Function to send email
 * The parameter is an object with the following properties:
 * 
 * - appName    -> Name of the application
 * - serverName -> Name of the server
 * - info       -> Information about the alert
 * - destination-> Email address to send the alert
 * 
 * @param {object} data 
 */
function sendEmail(data) {

  let subject = 'Alerta! dockerMon...'
  let body    = ```
                 Caro administrador do sistema.<br><br>
                 Foi despoltado um alerta com origem no container:
                 <b>${data.appName}</b></br></br>
                 No servidor:</br> 
                 <b>${data.serverName}</b></br></br> 
                 Contendo a seguinte informação:</br>
                 <b>${data.info}</b> 
                ```
  const nodemailer = require('nodemailer')
 
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  })

  const mailOptions = {
    from: emailUser,
    to: data.destination,
    subject: subject,
    html: body
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email enviado com sucesso: ' + info.response)
    }
  })
}

module.exports = { sendEmail }