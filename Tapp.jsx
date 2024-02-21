import React from "./core/React.js";

function Foo() {
  console.log("foo rerun");
  const [count, setCount] = React.useState(0);
  function handleClickFoo() {
    setCount((c) => c + 1);
  }

  return (
    <div>
      <h1>foo</h1>
      {count}
      <button onClick={handleClickFoo}>click</button>
    </div>
  );
}

function Bar() {
  console.log("bar rerun");
  const [count, setCount] = React.useState(0);
  function handleClickBar() {
    setCount((c) => c + 1);
    update();
  }

  return (
    <div>
      <h1>bar</h1>
      {count}
      <button onClick={handleClickBar}>click</button>
    </div>
  );
}

function App() {
  console.log("app rerun");
  const [count, setCount] = React.useState(0);
  function handleClickApp() {
    setCount((c) => c + 1);
  }

  return (
    <div>
      hi-mini-react count: {count}
      <button onClick={handleClickApp}>click</button>
      <Foo></Foo>
      <Bar></Bar>
    </div>
  );
}

export default App;
