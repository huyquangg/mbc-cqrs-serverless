import { CommandEntity } from '@mbc-cqrs-severless/core'

import { SettingAttributes } from '../dto/setting-attributes.dto'

export class SettingCommandEntity extends CommandEntity {
  attributes: SettingAttributes

  constructor(partial: Partial<SettingCommandEntity>) {
    super()

    Object.assign(this, partial)
  }
}
