
Errornous Query
```gql
{

    film(id: "ZmlsbXM6Mw==" ) {
      id
      t: title
      planetConnection {
        planets {
          foo: name
          newProp {
          id
          title
        }
        }
    
      }
    }   
}

```