import { createLowlight } from 'lowlight'
import { LANGUAGES } from './languages'

/** lowlight instance used by the live editor's CodeBlockLowlight extension. */
export const lowlight = createLowlight(LANGUAGES)

export { CODE_LANGUAGES } from './languages'
