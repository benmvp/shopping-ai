import {
  ExtendedMessage,
  FilterParameters,
  Item,
  ItemExtendedMessage,
  MatchedItems,
  ParsedAssistantMessage,
  SearchFunction,
} from '@/app/items/types'
import { isParsedAssistantMessage } from '../items/utils'

// delimit the Item IDs in the assistant messages to make them easier to find
const ITEM_ID_DELIMITER = '--'

// regex to match the Item ID in the line when parsing the assistant messages
const lineItemIdRegex = new RegExp(
  `${ITEM_ID_DELIMITER}(.+?)${ITEM_ID_DELIMITER}`,
  'g',
)

/**
 * Optimizes the parsed content by combining paragraphs of text into a single
 * paragraph and consecutive IDs into a single group
 */
const optimizeParsedContent = (
  parsedContent: ParsedAssistantMessage['parsedContent'],
): ParsedAssistantMessage['parsedContent'] => {
  const optimizedContent: ParsedAssistantMessage['parsedContent'] = []
  let currentParagraphs: string[] = []
  let currentItemIds: string[] = []

  for (const content of parsedContent) {
    if (Array.isArray(content)) {
      // if the content is an array, it's a group of Item IDs.

      // so we need to add the current group paragraphs we've been accumulating
      // to the optimized content as paragraphs (if it's not empty)
      if (currentParagraphs.length) {
        optimizedContent.push(currentParagraphs.join('\n\n'))

        // reset the current paragraph group
        currentParagraphs = []
      }

      // start accumulating the current group of Item IDs
      currentItemIds.push(...content)
    } else {
      // if the content is a string, it's a paragraph of text.

      // so we need to add the current group of Item IDs we've been accumulating
      // to the optimized content as a group of Item IDs (if it's not empty)
      if (currentItemIds.length) {
        optimizedContent.push(currentItemIds)

        // reset the current Item ID group
        currentItemIds = []
      }

      // start accumulating the current group of paragraphs
      currentParagraphs.push(content)
    }
  }

  // push any remaining content at the end (in theory only one of them should exit)
  if (currentItemIds.length) {
    optimizedContent.push(currentItemIds)
  }
  if (currentParagraphs.length) {
    optimizedContent.push(currentParagraphs.join('\n\n'))
  }

  return optimizedContent
}

/**
 * Parses the assistant messages to extract the recommended Item IDs from each
 * @param assistantContent The assistant message content
 * @param itemIdRegex The regex to use to extract the Item IDs from the message content
 */
export const parseRecommendedItemIds = (
  assistantContent: string,
): ParsedAssistantMessage['parsedContent'] => {
  // the goal is to split the assistant message into paragraphs, but in certain
  // cases there is a line of text that is not a paragraph (multiple line breaks
  // in a row), but only separate by a single line break from the recommended
  // items. so we find those non-Item lines and wrap them in extra newlines so
  // they are treated as paragraphs when we split on 2+ newlines
  if (!assistantContent.endsWith('\n')) {
    assistantContent += '\n'
  }

  const paragraphs = assistantContent
    .split('\n')
    .map((line) => (lineItemIdRegex.test(line) ? line : `\n${line}\n`))
    .join('\n')
    .split(/\n{2}/)
    .filter(Boolean)
    .map((paragraph) => paragraph.trim())

  // the tokenized messages are the same as the paragraphs except some are
  // replaced with `null` in the place where the items list should be
  const parsedContent = paragraphs.map((paragraph) => {
    const itemIds = Array.from(
      paragraph.matchAll(lineItemIdRegex),

      // `itemId` is the first capture group (2nd item)
      // this will also strip out the delimiters from the Item ID
      (match) => match[1],
    ).filter(Boolean)

    // return the Item IDs if there are any, otherwise return the paragraph
    return itemIds.length ? itemIds : paragraph
  })

  return optimizeParsedContent(parsedContent)
}

/**
 * Add the full item details to the assistant messages with Item IDs
 */
export const addItemsToMessages = async (
  messages: ExtendedMessage[],
  getItems: (itemIds: string[]) => Promise<Item[]>,
): Promise<ItemExtendedMessage[]> => {
  // Build up a list of all the Item IDs in the response messages
  const allItemIds = new Set(
    messages
      .filter(isParsedAssistantMessage)

      // itemIds is an array of Item IDs while text content is a string, so get
      // back the array of Item IDs
      .flatMap((message) =>
        message.parsedContent.map((content) =>
          Array.isArray(content) ? content : null,
        ),
      )

      // filter out any `null` values
      .filter((content): content is string[] => Boolean(content))

      // flatten the array of arrays of Item IDs
      .flat(),

    // remove the delimiters from the Item IDs
    // .map((id) => id.replaceAll(ITEM_ID_DELIMITER, '')),
  )
  const allItems = await getItems(Array.from(allItemIds))
  const itemIdToItemMap = new Map(allItems.map((item) => [item.id, item]))

  // add `items` property to each of the assistant
  return messages.map((message): ItemExtendedMessage => {
    if (!isParsedAssistantMessage(message)) {
      return message
    }

    const items = Object.fromEntries(
      message.parsedContent
        // get the array of Item IDs or `null` if it's a paragraph of text
        .map((content) => (Array.isArray(content) ? content : null))

        // filter out any `null` values
        .filter((content): content is string[] => Boolean(content))

        // flatten the group of Item IDs
        .flat()

        // get the item for each Item ID
        .map((id) => itemIdToItemMap.get(id))

        // filter out any `undefined` items
        .filter((item): item is Item => Boolean(item))

        // convert to entries
        .map((item) => [item.id, item]),
    )

    return {
      ...message,
      items,
    }
  })
}

/**
 * Delimit the Item IDs in the search results to make them easier to find in the assistant messages
 * @returns The matched items from the search function with the Item IDs delimited
 */
export const delimitSearchResults = <FP extends FilterParameters>(
  searchFunction: SearchFunction<FP>,
) => {
  return async (filterParams: FP): Promise<MatchedItems> => {
    const { items } = await searchFunction(filterParams)

    return {
      items: items.map((item) => ({
        ...item,
        id: `${ITEM_ID_DELIMITER}${item.id}${ITEM_ID_DELIMITER}`,
      })),
    }
  }
}
