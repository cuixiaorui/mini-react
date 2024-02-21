function createTextNode(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        // console.log(child, typeof child)
        const isTextNode =
          typeof child === "string" || typeof child === "number";
        return isTextNode ? createTextNode(child) : child;
      }),
    },
  };
}

function render(el, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [el],
    },
  };

  nextWorkOfUnit = wipRoot;
}

let wipRoot = null;
let currentRoot = null;
let nextWorkOfUnit = null;
let deletions = [];
let wipFiber = null;
function workLoop(deadline) {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit = performWorkOfUnit(nextWorkOfUnit);

    if (wipRoot?.sibling?.type === nextWorkOfUnit?.type) {
      nextWorkOfUnit = undefined;
    }

    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextWorkOfUnit && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

function commitRoot() {
  deletions.forEach(commitDeletion);
  commitWork(wipRoot.child);
  commitEffectHooks();
  currentRoot = wipRoot;
  wipRoot = null;
  deletions = [];
}

function commitEffectHooks() {
  function run(fiber) {
    if (!fiber) return;

    if (!fiber.alternate) {
      // init
      fiber.effectHooks?.forEach((hook) => {
        hook.cleanup = hook.callback();
      });
    } else {
      // update
      // deps 有没有发生改变
      fiber.effectHooks?.forEach((newHook, index) => {
        if (newHook.deps.length > 0) {
          const oldEffectHook = fiber.alternate?.effectHooks[index];

          // some
          const needUpdate = oldEffectHook?.deps.some((oldDep, i) => {
            return oldDep !== newHook.deps[i];
          });

          needUpdate && (newHook.cleanup = newHook.callback());
        }
      });
    }

    run(fiber.child);
    run(fiber.sibling);
  }
  function runCleanup(fiber) {
    if (!fiber) return;

    fiber.alternate?.effectHooks?.forEach((hook) => {
      if (hook.deps.length > 0) {
        hook.cleanup && hook.cleanup();
      }
    });

    runCleanup(fiber.child);
    runCleanup(fiber.sibling);
  }

  runCleanup(wipRoot);
  run(wipRoot);
}

function commitDeletion(fiber) {
  if (fiber.dom) {
    let fiberParent = fiber.parent;
    while (!fiberParent.dom) {
      fiberParent = fiberParent.parent;
    }
    fiberParent.dom.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child);
  }
}

function commitWork(fiber) {
  if (!fiber) return;

  let fiberParent = fiber.parent;
  while (!fiberParent.dom) {
    fiberParent = fiberParent.parent;
  }

  if (fiber.effectTag === "update") {
    updateProps(fiber.dom, fiber.props, fiber.alternate?.props);
  } else if (fiber.effectTag === "placement") {
    if (fiber.dom) {
      fiberParent.dom.append(fiber.dom);
    }
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function createDom(type) {
  return type === "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(type);
}

let eventId = 1;
function updateProps(dom, nextProps, prevProps) {
  // Object.keys(nextProps).forEach((key) => {
  //   if (key !== "children") {
  //     if (key.startsWith("on")) {
  //       const eventType = key.slice(2).toLowerCase();
  //       dom.addEventListener(eventType, nextProps[key]);
  //     } else {
  //       dom[key] = nextProps[key];
  //     }
  //   }
  // });
  // {id: "1"} {}
  // 1. old 有  new 没有 删除
  Object.keys(prevProps).forEach((key) => {
    if (key !== "children") {
      if (!(key in nextProps)) {
        dom.removeAttribute(key);
      }
    }
  });
  // 2. new 有 old 没有 添加
  // 3. new 有 old 有 修改
  Object.keys(nextProps).forEach((key) => {
    if (key !== "children") {
      if (nextProps[key] !== prevProps[key]) {
        if (key.startsWith("on")) {
          const eventType = key.slice(2).toLowerCase();

          if (prevProps[key] && prevProps[key].id) {
            console.log("prev eventId: ", prevProps[key].id);
          }

          dom.removeEventListener(eventType, prevProps[key]);

          if (!nextProps[key].id) {
            nextProps[key].id = eventId;
            console.log("current eventId: ", nextProps[key].id);
            eventId++;
          }
          dom.addEventListener(eventType, nextProps[key]);
        } else {
          dom[key] = nextProps[key];
        }
      }
    }
  });
}

function reconcileChildren(fiber, children) {
  let oldFiber = fiber.alternate?.child;
  let prevChild = null;
  children.forEach((child, index) => {
    // console.log(child)
    const isSameType = oldFiber && oldFiber.type === child.type;
    // console.log("isSameType", isSameType)

    let newFiber;
    if (isSameType) {
      // update
      newFiber = {
        type: child.type,
        props: child.props,
        child: null,
        parent: fiber,
        sibling: null,
        dom: oldFiber.dom,
        effectTag: "update",
        alternate: oldFiber,
      };
    } else {
      if (child) {
        newFiber = {
          type: child.type,
          props: child.props,
          child: null,
          parent: fiber,
          sibling: null,
          dom: null,
          effectTag: "placement",
        };
      }

      if (oldFiber) {
        deletions.push(oldFiber);
      }
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevChild.sibling = newFiber;
    }

    if (newFiber) {
      prevChild = newFiber;
    }
  });

  while (oldFiber) {
    deletions.push(oldFiber);

    oldFiber = oldFiber.sibling;
  }
}

function updateFunctionComponent(fiber) {
  stateHookIndex = 0;
  effectHooks = [];
  wipFiber = fiber;

  const children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    const dom = (fiber.dom = createDom(fiber.type));

    updateProps(dom, fiber.props, {});
  }

  const children = fiber.props.children;
  reconcileChildren(fiber, children);
}

function performWorkOfUnit(fiber) {
  const isFunctionComponent = typeof fiber.type === "function";

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 4. 返回下一个要执行的任务
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
}

requestIdleCallback(workLoop);

function update() {
  let currentFiber = wipFiber;

  return () => {
    wipRoot = {
      ...currentFiber,
      alternate: currentFiber,
    };

    // wipRoot = {
    //   dom: currentRoot.dom,
    //   props: currentRoot.props,
    //   alternate: currentRoot,
    // };

    nextWorkOfUnit = wipRoot;
  };
}

let stateHookIndex;
function useState(initial) {
  let currentFiber = wipFiber;
  const oldHook = currentFiber.alternate?.stateHooks[stateHookIndex];
  const stateHook = {
    state: oldHook ? oldHook.state : initial,
    queue: oldHook ? oldHook.queue : [],
  };

  stateHook.queue.forEach((action) => {
    stateHook.state = action(stateHook.state);
  });

  stateHook.queue = [];

  if (!currentFiber.stateHooks) {
    currentFiber.stateHooks = [];
  }

  currentFiber.stateHooks[stateHookIndex] = stateHook

  stateHookIndex++;


  function setState(action) {
    console.log(stateHook.fiber);
    const eagerState =
      typeof action === "function" ? action(stateHook.state) : action;

    if (eagerState === stateHook.state) return;

    stateHook.queue.push(typeof action === "function" ? action : () => action);

    // wipRoot = {
    //   ...stateHook.fiber,
    //   alternate: stateHook.fiber
    // }

    // wipRoot = {
    //   ...currentFiber,
    //   alternate: currentFiber,
    // };
    wipRoot = currentFiber;
    wipRoot.alternate = currentFiber;

    // wipRoot = currentFiber;
    // wipRoot.alternate = currentFiber

    nextWorkOfUnit = wipRoot;
  }

  return [stateHook.state, setState];
}

let effectHooks;
function useEffect(callback, deps) {
  const effectHook = {
    callback,
    deps,
    cleanup: undefined,
  };
  effectHooks.push(effectHook);

  wipFiber.effectHooks = effectHooks;
}

const React = {
  update,
  useEffect,
  useState,
  render,
  createElement,
};

export default React;
