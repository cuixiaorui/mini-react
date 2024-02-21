import React from "./core/React.js";

function Foo() {
  const [count, setCount] = React.useState(10);
  const [bar, setBar] = React.useState("bar");
  function handleClick() {
    setCount((c) => c + 1);
    setBar((s) => s + 1);
  }

  return (
    <div>
      <button onClick={handleClick}>add</button>
      <br />
      count: {count}
      <br />
      bar: {bar}
    </div>
  );
}

function Bar() {
  const [count, setCount] = React.useState(10);
  function handleClick() {
    setCount((c) => c + 1);
//     setCount((c) => c + 1);
  }

  return (
    <div>
      <button onClick={handleClick}>add</button>
      count: {count}
    </div>
  );
}

function App() {
  const [count, setCount] = React.useState(10);
  const [attribute, setAttribute] = React.useState({ id: "app" });
  function handleClick() {
    setCount((c) => c + 1);
    //     setAttribute(a => {
    //       a.id += 1
    //       return a
    //     })

    setAttribute((o) => {
      return {
        ...o,
        id: o.id + 1,
      };
    });
  }

  return (
    <div {...attribute}>
      hi-mini-react
      <button onClick={handleClick}>add</button>
      count: {count}
      <Foo></Foo>
      <Bar></Bar>
    </div>
  );
}

export default App;
