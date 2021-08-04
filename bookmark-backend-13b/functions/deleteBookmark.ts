const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

async function deleteTodo(bookmarkId: string) {
    const params = {
        TableName: process.env.BOOKMARK_TABLE,
        Key: {
            id: bookmarkId
        }
    }
    try {
        await docClient.delete(params).promise()
        return bookmarkId
    } catch (err) {
        console.log('DynamoDB error: ', err)
        return null
    }
}

export default deleteTodo;