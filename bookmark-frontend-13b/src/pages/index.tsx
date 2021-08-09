import React, { useState, useRef, useEffect } from "react"
import { addBookmark } from "../graphql/mutations"
import { getBookmark } from "../graphql/queries"
import { deleteBookmark } from "../graphql/mutations"
import { API, graphqlOperation } from "aws-amplify"
import shortid from "shortid"

interface title {
  title: string
  id: string
  url: string
}

interface incomingData {
  data: {
    getBookmark: title[]
  }
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [todoData, setTodoData] = useState<incomingData | null>(null)
  const bookmarkTitleRef = useRef<any>("")
  const bookmarkUrlRef = useRef<any>("")

  const addBookmarkMutation = async () => {
    try {
      const bookmark = {
        id: shortid.generate(),
        title: bookmarkTitleRef.current.value,
        url: bookmarkUrlRef.current.value,
      }
      const data = await API.graphql({
        query: addBookmark,
        variables: {
          bookmark: bookmark,
        },
      })
      bookmarkTitleRef.current.value = ""
      bookmarkUrlRef.current.value = ""
      fetchTodos()
    } catch (e) {
      console.log(e)
    }
  }

  const fetchTodos = async () => {
    try {
      const data = await API.graphql({
        query: getBookmark,
      })
      setTodoData(data as incomingData)
      setLoading(false)
    } catch (e) {
      console.log(e)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  const dltTodo = async id => {
    try {
      const bookmarkId = id
      const dltBookmark = await API.graphql({
        query: deleteBookmark,
        variables: { bookmarkId: bookmarkId },
      })
      fetchTodos()
    } catch (e) {
      console.log(e)
    }
  }
  return (
    <div>
      {loading ? (
        <h1>Loading ...</h1>
      ) : (
        <div>
          <h2>Project 13B & 14B</h2>
          <label>
            Bookmark:
            <input ref={bookmarkTitleRef} />
            <input ref={bookmarkUrlRef} />
          </label>
          <button onClick={() => addBookmarkMutation()}>Create Bookmark</button>
          {todoData.data &&
            todoData.data.getBookmark.map((item, ind) => (
              <div style={{ marginLeft: "1rem", marginTop: "2rem" }} key={ind}>
                {item.title}
                <br />
                {item.url}
                <button onClick={() => dltTodo(item.id)}>Delete</button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
