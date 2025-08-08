import { Context, Schema, h } from 'koishi'

import type {} from '@ltxhhz/koishi-plugin-skia-canvas'
import Color from 'color'
import colors from './colors'
import { join } from 'path'

export const name = 'give-you-some-color'

export const inject = ['skia']

export interface Config {
  width?: number
  height?: number
  template:
    | {
        enable: true
        image: {
          custom: boolean
          path: string
        }
        text: string
        textColor: string
        textAlign: 'left' | 'center' | 'right'
        textBaseline: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'
        textLineHeight: number
        textX: string
        textY: string
        fontSize: number
        fontFamily: string
        fontWeight: string
        fontStyle: string
      }
    | {
        enable?: false
      }
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    width: Schema.number().default(100).description('图片宽，配置模板后使用模板的宽'),
    height: Schema.number().default(100).description('图片高，配置模板后使用模板的高')
  }),
  Schema.object({
    template: Schema.intersect([
      Schema.object({
        enable: Schema.boolean().default(false).description('是否启用')
      }),
      Schema.union([
        Schema.object({
          enable: Schema.const(true).required(),
          image: Schema.intersect([
            Schema.object({
              custom: Schema.boolean().default(false).description('使用自定义图片')
            }),
            Schema.union([
              Schema.object({
                custom: Schema.const(true).required(),
                path: Schema.path({
                  filters: [
                    {
                      name: 'image',
                      extensions: ['png']
                    }
                  ]
                })
                  .required()
                  .description('模板图片路径')
              }),
              Schema.object({
                custom: Schema.const(false),
                path: Schema.union([Schema.const('assets/template1.png').description('熊猫头1'), Schema.const('assets/template2.png').description('魔性小人1')]).description('自带模板')
              })
            ])
          ]),
          text: Schema.string()
            .default('这是#[input]\nThis is #[inputE]')
            .description('模板文字内容 `#[input]`为用户输入的颜色，`#[inputE]`为匹配到的英文名，没有则回退 `#[input]`，`#[hex]` `#[hexa]`为转换过的十六进制颜色，`#[rgb]`为`rgb(r, g, b)`，还有其他几种格式'),
          textColor: Schema.string().default('black').description('颜色值'),
          textAlign: Schema.union(['left', 'center', 'right']).default('center').description('文字水平对齐方式'),
          textBaseline: Schema.union(['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom']).default('middle').description('文字对齐的基线'),
          textX: Schema.string().default('0.5w').description('文字x坐标，填入数字则为像素(px)单位，填入 `数字+字母`则为 `数字*字母所代表的值`，`w`为图片宽，`h`为图片高，`d`为图片对角线长'),
          textY: Schema.string().default('0.8h').description('文字y坐标'),
          textLineHeight: Schema.number().default(20).description('文字行高'),
          fontSize: Schema.number().default(12).description('字体大小'),
          fontFamily: Schema.string().default('SimHei').description('字体系列'),
          fontWeight: Schema.string().default('normal').description('字体粗细'),
          fontStyle: Schema.string().default('normal').description('字体样式')
        }),
        Schema.object({})
      ])
    ])
  }).description('模板')
])

export function apply(ctx: Context, config: Config) {
  const { Canvas, loadImage, FontLibrary } = ctx.skia
  // @ts-ignore
  config.template.image = {
    custom: false,
    path: 'assets/template1.png',
    // @ts-ignore
    ...config.template.image
  }

  config.template = {
    enable: false,
    // @ts-ignore
    text: '这是#[input]\nThis is #[inputE]',
    textColor: 'black',
    textAlign: 'center' as const,
    textBaseline: 'middle' as const,
    textLineHeight: 20,
    fontSize: 12,
    fontFamily: 'SimHei',
    fontWeight: 'normal',
    fontStyle: 'normal',
    ...config.template
  }
  config.height ||= 100
  config.width ||= 100
  // logger.info(FontLibrary.families.slice(0, FontLibrary.families.length / 2))
  // logger.info(FontLibrary.families.slice(FontLibrary.families.length / 2))
  ctx
    .command('color [color:text]', '给你点颜色看看')
    .alias('颜色', '给你点颜色看看')
    // .shortcut(/^这是\s*(.+)\s*色$/, { args: ['$1'] }) //弃用于 koishi 4.16.5
    // .shortcut(/^这是\s*(#.{3,8})\s*$/, { args: ['$1'] })
    // .shortcut(/^这是\s*(\w+?)\((.+)\)\s*$/, { args: ['$1($2)'] })
    .action(async ({}, input) => {
      ctx.logger.info('<-- ', input)
      if (input) {
        try {
          const colorName: string | undefined = colors[input] || colors[input.replace(/色$/, '')]
          let co: Color
          if (colorName) {
            co = Color(colorName.toLowerCase())
          } else {
            co = Color(input)
          }
          ctx.logger.info('--> ', co.string())
          if (config.template.enable) {
            const tem = await loadImage(config.template.image.custom ? config.template.image.path : join(__dirname, config.template.image.path))
            const canvas = new Canvas(tem.width, tem.height)
            const cCtx = canvas.getContext('2d')
            cCtx.save()
            cCtx.fillStyle = co.hexa()
            cCtx.fillRect(0, 0, canvas.width, canvas.height)
            cCtx.restore()
            cCtx.drawImage(tem, 0, 0)
            cCtx.fillStyle = config.template.textColor
            cCtx.textBaseline = config.template.textBaseline
            cCtx.textAlign = config.template.textAlign
            cCtx.font = `${config.template.fontWeight} ${config.template.fontStyle} ${config.template.fontSize}px/${config.template.textLineHeight}px ${config.template.fontFamily}`
            cCtx.textWrap = true
            // prettier-ignore
            cCtx.fillText(config.template.text
              .replaceAll('#[input]', input)
              .replaceAll('#[inputE]', colorName || input)
              .replaceAll('#[hex]', co.hex())
              .replaceAll('#[hexa]', co.hexa())
              .replaceAll('#[rgb]', co.rgb().string())
              .replaceAll('#[rgba]', `rgba(${co.red()}, ${co.green()}, ${co.blue()}, ${co.alpha()})`)
              .replaceAll('#[hsl]', co.hsl().string())
              .replaceAll('#[hsv]', co.hsv().string())
              .replaceAll('#[hwb]', co.hwb().string())
              .replaceAll('#[cmyk]', co.cmyk().string())
              .replaceAll('#[hcg]', co.hcg().string()), calcPos(config.template.textX, tem), calcPos(config.template.textY, tem))
            return h.image(canvas.toBufferSync('png'), 'image/png')
          } else {
            const canvas = new Canvas(config.width, config.height)
            const cCtx = canvas.getContext('2d')
            cCtx.fillStyle = co.hexa()
            cCtx.fillRect(0, 0, canvas.width, canvas.height)
            return h.image(canvas.toBufferSync('png'), 'image/png')
          }
        } catch (error) {
          ctx.logger.warn(error)
        }
      }
    })
}

function calcPos(str: string, { width, height }: { width: number; height: number }) {
  const reg = /^([\d\.]+)([a-z])$/
  const res = str.toLowerCase().match(reg)
  if (res) {
    switch (res[2]) {
      case 'w':
        return width * Number(res[1])
      case 'h':
        return height * Number(res[1])
      case 'd':
        return Number(res[1]) * Math.sqrt(width ** 2 + height ** 2)
      default:
        break
    }
  }
  return Number(str)
}
