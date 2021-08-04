const AWS = require("aws-sdk");
import Bookmark from "./Bookmark";
import addBookmark from "./addBookmark";
import getBookmark from "./getBookmark";
import deleteBookmark from "./deleteBookmark";

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    bookmarkId: string;
    bookmark: Bookmark;
  };
};

function helper() {
  const eventBridge = new AWS.EventBridge();

  return eventBridge
    .putEvents({
      Entries: [
        {
          EventBusName: "default",
          Source: "bookmarkRule",
          DetailType: "Event trigger from bookmark",
          Detail: `{ "Event": "Event Trigger Sucessfully" }`,
        },
      ],
    })
    .promise();
}

exports.handler = async (event: AppSyncEvent) => {
  const e = await helper();
  switch (event.info.fieldName) {
    case "addBookmark":
      return await addBookmark(event.arguments.bookmark);
    case "getBookmark":
      return await getBookmark();
    case "deleteBookmark":
      return await deleteBookmark(event.arguments.bookmarkId);

    default:
      return null;
  }
};
