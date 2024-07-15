import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import { Skeleton } from '@mui/material'
import Typography from '@mui/material/Typography'
import Markdown from './Markdown'
import { Message } from '@/ai/types'
import {
  isItemAssistantMessage,
  isParsedAssistantMessage,
} from '../items/utils'
import { Item } from '../items/types'

const ItemCard = ({ item }: { item: Item }) => {
  return (
    <Card component="section" sx={{ maxWidth: '40%', minWidth: '200px' }}>
      <CardActionArea href={item.url} target="_blank">
        <CardMedia component="img" height="300" image={item.imageUrl} alt="" />
        <CardContent>
          <Typography gutterBottom variant="body1" component="h1">
            {item.title}
          </Typography>
          {item.price && (
            <Typography variant="body2" color="text.secondary">
              {`\$${item.price.toFixed(2)}`}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

const ItemCardLoading = () => {
  return (
    <Card component="section" sx={{ maxWidth: '40%', minWidth: '200px' }}>
      <Skeleton width={200} height={300} />
      <CardContent>
        <Skeleton />
        <Skeleton />
      </CardContent>
    </Card>
  )
}

const AssistantChatBubbleContent = ({ message }: { message: Message }) => {
  console.log('AssistantChatBubbleContent', message)
  if (!isParsedAssistantMessage(message)) {
    return null
  }

  const { itemIds: groupedItemIds, tokenizedContent } = message

  return (
    <>
      {groupedItemIds.map((itemIds, index) => {
        const content = tokenizedContent[index]

        // `itemIds` is empty when there are no items to recommend. But there is
        // content in `tokenizedContent` to display.
        if (itemIds.length === 0) {
          return (
            <Box key={content}>
              <Markdown>{content}</Markdown>
            </Box>
          )
        }

        // On the other hand, when `itemIds` is not empty we either have items to show or we're in a stream loading state (and the `tokenizedContent` is `null` in this case).

        const items = isItemAssistantMessage(message) ? message.items : {}

        return (
          itemIds.length > 0 && (
            <Box
              key={itemIds.join('-')}
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                flexWrap: 'nowrap',
                gap: 2,
                overflowX: 'auto',
              }}
            >
              {itemIds.map((itemId, index) =>
                items[itemId] ? (
                  <ItemCard key={itemId} item={items[itemId]} />
                ) : (
                  <ItemCardLoading key={itemId} />
                ),
              )}
            </Box>
          )
        )
      })}
      {message?.filter && (
        <Typography component="div" variant="caption">
          {JSON.stringify(message.filter)}
        </Typography>
      )}
    </>
  )
}

export default AssistantChatBubbleContent