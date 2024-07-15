import {
  AssistantMessage,
  Message,
  AssistantType,
  FunctionDeclaration,
} from '../types'

/**
 * A function to process a raw assistant message chunk being streamed to the
 * client
 */

export type ProcessAssistantMessageChunk = (
  assistantMessage: AssistantMessage,
) => AssistantMessage
/**
 * A function to process the raw messages from the assistant when the final
 * messages ready to be streamed to the client
 */

export type ProcessMessages = (rawMessages: Message[]) => Promise<Message[]>

export interface ChatOptions {
  /**
   * The desired assistant to fulfill the chat request
   */
  assistantType: AssistantType

  /**
   * The function declarations to use during the chat with the assistant
   */
  functionDeclarations: FunctionDeclaration[]

  /**
   * History of messages to pass to the assistant chat when sending the next
   * user message
   */
  history: Message[]

  /**
   * A function to process the raw messages from the assistant when the final
   * messages ready to be streamed to the client
   */
  processMessages?: ProcessMessages

  /**
   * The additional context to steer the behavior of the model
   */
  systemInstruction: string

  /**
   * The user prompt message to send with the next request
   */
  userPrompt: string
}
