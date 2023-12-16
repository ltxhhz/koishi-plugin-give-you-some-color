import { Context, Schema, h } from 'koishi'

import type {} from '@ltxhhz/koishi-plugin-skia-canvas'
import Color from 'color'
import colors from './colors'

export const name = 'give-you-some-color'

export const inject = ['skia']

export interface Config {
  width?: number
  height?: number
}

export const Config: Schema<Config> = Schema.object({
  width: Schema.number().default(100).description('图片宽'),
  height: Schema.number().default(100).description('图片高')
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('color')
  ctx
    .command('color [color:string] 给你点颜色看看')
    .alias('颜色', '给你点颜色看看')
    .shortcut(/^这是\s*(.+)\s*色$/, { args: ['$1'] })
    .shortcut(/^这是\s*(#.{3,8})\s*$/, { args: ['$1'] })
    .shortcut(/^这是\s*(\w+?)\((.+)\)\s*$/, { args: ['$1($2)'] })
    .action(({}, ...args) => {
      let color = args.join('')
      const { Canvas } = ctx.skia
      logger.info(color)
      if (color) {
        try {
          const colorName = colors[color]
          if (colorName) {
            color = colorName
          } else {
            color = Color(color).hexa()
          }
          logger.info(color)
          const canvas = new Canvas(config.width, config.height)
          const cCtx = canvas.getContext('2d')
          cCtx.fillStyle = color
          cCtx.fillRect(0, 0, canvas.width, canvas.height)
          return h.image(canvas.toBufferSync('png'), 'image/png')
        } catch (error) {
          logger.error(error)
        }
      }
    })
}

