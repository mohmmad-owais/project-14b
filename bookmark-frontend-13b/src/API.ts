/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type BookmarkInput = {
  id: string,
  title: string,
  url: string,
};

export type Bookmark = {
  __typename: "Bookmark",
  id: string,
  title: string,
  url: string,
};

export type AddBookmarkMutationVariables = {
  bookmark: BookmarkInput,
};

export type AddBookmarkMutation = {
  addBookmark?:  {
    __typename: "Bookmark",
    id: string,
    title: string,
    url: string,
  } | null,
};

export type DeleteBookmarkMutationVariables = {
  bookmarkId: string,
};

export type DeleteBookmarkMutation = {
  deleteBookmark?: string | null,
};

export type GetBookmarkQuery = {
  getBookmark?:  Array< {
    __typename: "Bookmark",
    id: string,
    title: string,
    url: string,
  } | null > | null,
};
