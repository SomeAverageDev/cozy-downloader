const cozydb = require('cozydb');
const debug = require('debug')('downloader');
var fs = require('fs');
const User = require('../models/user');


const logoPath = fs.realpathSync('./server/mails/assets/cozy-logo.png');

const localization = require('../libs/localization_manager');

module.exports.sendDownloadNotification = function(templateName, downloadUrl, filename, url, localHost, folderInFilesId, callback) {

  return User.getUserInfo(function(err, user) {
    if (err) {
      return callback(err);
    }

    const templateOptions = {
      userName: user.name,
      downloadUrl: downloadUrl,
      url: url,
      folderInFilesId: folderInFilesId,
      localHost: localHost,
      fileName: filename,
    };
    debug ('templateOptions:', templateOptions);

    const htmlTemplate = localization.getEmailTemplate(templateName);
    debug ('htmlTemplate:', htmlTemplate(templateOptions));

    const mailOptions = {
      from: 'myCozy <' + (user.email || 'cozy@localhost') + '>',
      subject: localization.t('email-new-download-title'),
      html: htmlTemplate(templateOptions),
      content: localization.t('email-new-download-content', templateOptions),
      attachments: [
        {
          path: logoPath,
          filename: 'cozy-logo.png',
          cid: 'cozy-logo',
        }
      ],
    };
    return cozydb.api.sendMailToUser(mailOptions, function (err) {
      if (err != null) {
        debug('An error occured while sending email:', err);
      }
    });
  });
};
