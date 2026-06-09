import { useRef } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'

type Dir = 'nw' | 'ne' | 'sw' | 'se'
const HANDLES: Dir[] = ['nw', 'ne', 'sw', 'se']

/** Editor-only image view with drag-to-resize handles. Export uses renderHTML. */
export function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps): JSX.Element {
  const { src, alt, width, align } = node.attrs as {
    src: string
    alt?: string
    width?: number | null
    align?: string | null
  }
  const wrapperRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLSpanElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const liveWidth = useRef<number | null>(null)

  const boxStyle: React.CSSProperties = {
    width: width ? `${width}px` : undefined,
    marginLeft: align === 'center' || align === 'right' ? 'auto' : 0,
    marginRight: align === 'center' || align === 'left' ? 'auto' : 0
  }

  const startResize = (e: React.MouseEvent, dir: Dir): void => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = imgRef.current?.clientWidth ?? 0
    const maxW = wrapperRef.current?.clientWidth ?? 2000
    const onMove = (ev: MouseEvent): void => {
      const dx = ev.clientX - startX
      let w = dir === 'ne' || dir === 'se' ? startWidth + dx : startWidth - dx
      w = Math.max(40, Math.min(w, maxW))
      liveWidth.current = Math.round(w)
      if (boxRef.current) boxRef.current.style.width = `${w}px`
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (liveWidth.current) updateAttributes({ width: liveWidth.current })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <NodeViewWrapper ref={wrapperRef} className="doc-image-nv" data-align={align ?? undefined}>
      <span ref={boxRef} className={`doc-image-box ${selected ? 'selected' : ''}`} style={boxStyle}>
        <img ref={imgRef} src={src} alt={alt ?? ''} draggable={false} />
        {selected &&
          HANDLES.map((dir) => (
            <span
              key={dir}
              className={`doc-image-handle handle-${dir}`}
              onMouseDown={(e) => startResize(e, dir)}
            />
          ))}
      </span>
    </NodeViewWrapper>
  )
}
