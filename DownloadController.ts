import { NextFunction, Request, Response } from 'express'
import { FTPSettings } from '@interfaces'
import { FTPSettingsRepository } from '@repositories'
import { getHttpException } from '@services'

enum keyTypePaths {
  publicKeySsh = 'pub-key-ssh',
  privateKeySsh = 'priv-key-ssh',
  publicKeyPgp = 'pub-key-pgp',
  privateKeyPgp = 'priv-key-pgp',
  replacementPublicKeyPgp = 'replacement-pub-key-pgp',
  replacementPublicKeySsh = 'replacement-pub-key-ssh',
}

export class DownloadController {
  static async downloadKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { keyType, token } = req.params

      const { query, type, pair } =
        {
          [keyTypePaths.publicKeySsh]: {
            query: 'public_key_ssh',
            type: 'SSH',
            pair: 'Public',
          },
          [keyTypePaths.privateKeySsh]: {
            query: 'private_key_ssh',
            type: 'SSH',
            pair: 'Private',
          },
          [keyTypePaths.publicKeyPgp]: {
            query: 'public_key_pgp',
            type: 'PGP',
            pair: 'Public',
          },
          [keyTypePaths.privateKeyPgp]: {
            query: 'private_key_pgp',
            type: 'PGP',
            pair: 'Private',
          },
          [keyTypePaths.replacementPublicKeyPgp]: {
            query: 'replacement_pgp_public_key',
            type: 'Replacement-PGP',
            pair: 'Public',
          },
          [keyTypePaths.replacementPublicKeySsh]: {
            query: 'replacement_ssh_public_key',
            type: 'Replacement-SSH',
            pair: 'Public',
          },
        }[keyType as keyTypePaths] || {}

      if (!query) {
        return res.status(404).json({
          message: 'Invalid key type.',
        })
      }

      const {
        ftp_name,
        ...ftpSettings
      } = await FTPSettingsRepository.getFtpSettingsByToken(token, [
        query,
        'ftp_name',
      ])

      const key = ftpSettings[query as keyof Omit<FTPSettings, 'ftp_name'>]

      if (key) {
        const ftpNameNonSpecialChars = ftp_name.replace(/(\W+)/gi, '-')

        res.setHeader('Content-type', 'text/plain')
        res.attachment(`${ftpNameNonSpecialChars}-${type}-${pair}.txt`)
        res.type('txt')
        res.json({ key, fileName: `${ftpNameNonSpecialChars}-${type}-${pair}` })
      } else {
        res.status(404).json({
          message: 'Key is not found.',
        })
      }
    } catch (e) {
      return next(getHttpException(e, 500))
    }
  }
}
