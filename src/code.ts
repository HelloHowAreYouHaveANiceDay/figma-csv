
// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).

import * as Papa from 'papaparse';

// shitty debug logging
const debug = false;
const debugLog = (message: any) => debug ? console.log(`plugin script: ${message}`) : null;

debugLog("start");

figma.showUI(__html__, { width: 200, height: 200 });

let upsertToTable: Function
let isSyncing: boolean = false;

/**
 * Posts an error to the ui
 * 
 * @param msg - message to send to ui
 */
function sendUiError(msg: any) {
  figma.ui.postMessage({
    pluginMessage: {
      type: "error",
      data: msg,
    },
  });
}

/**
 * Posts a message to the ui
 * 
 * @param msg - message to send to ui
 */
function sendUiMessage(msg: string) {
  figma.ui.postMessage({
    pluginMessage: {
      type: "message",
      data: msg,
    },
  });
}

/**
 * 
 * @param data - data to send to ui
 */
function sendUiDownloadCSV(data: any) {
  figma.ui.postMessage({
    pluginMessage: {
      type: "download-csv",
      data: data,
    },
  });
}


/**
 */
const initialize = async () => {
}

/**
 * Handles messages from the ui. Kicks off plugin functions.
 * 
 * @param msg - message from ui
 */
figma.ui.onmessage = async (msg) => {
  debugLog(msg);

  switch (msg.type) {
    case 'download-csv':
      // data request from ui
      debugLog('data request')
      const nodes = await getAllSceneNodes()
      const data = await Promise.all(nodes.map(await mapNodeToRecord));
      // debugLog(JSON.stringify(data))
      const csv = Papa.unparse(data)
      sendUiDownloadCSV(JSON.stringify({
        csv: csv,
      }));
      break;
    case 'initialize':
      await initialize();
      break;
    default:
      break;
  }
};

async function getAllSceneNodes() {
  let nodes: SceneNode[] = [];
  const allNodes: SceneNode[] = [];

  debugLog("getting nodes")
  nodes = figma.currentPage.children.map((n) => n);
  getAllChildNodes(nodes, allNodes);
  debugLog(allNodes.length)
  debugLog("got nodes")

  return allNodes;
}

const nodeProperties = [
  {
    
  }
]

async function mapNodeToRecord(node: SceneNode) {
  debugLog(`mapping ${node}`)
  const nodeKeys = getAllProperties(node);
  const nodeData: Record<string, any> = {}
  
  for (const key of nodeKeys) {
    try {
      // @ts-ignore
      const value = await node[key];
      // Check if the value is a function
      if (typeof value === 'function') {
        // nodeData[key] = null;
        continue; // Skip functions
      }
      // Check if the value is an object type and not null
      else if (value !== null && typeof value === 'object') {
        nodeData[key] = JSON.stringify(value);
      } else {
        nodeData[key] = value;
      }
    } catch (e) {
      // debugLog(`error getting ${key} from ${node}`)
    }
  }
  
  return nodeData
}

function getAllProperties(obj: SceneNode): string[] {
  const properties = new Set<string>();

  while (obj) {
    Object.getOwnPropertyNames(obj).forEach(prop => properties.add(prop));
    obj = Object.getPrototypeOf(obj); // Move up the prototype chain
  }

  return [...properties];
}


// Get all child nodes from initial array of nodes
function getAllChildNodes(nodes: SceneNode[], result: SceneNode[]) {
  // Iterate over all nodes in the array
  nodes.forEach((node) => {
    // Add the current node to the result array
    result.push(node);

    // If the current node is a container (e.g. a frame or group), recurse on its children
    //@ts-ignore property 'children' does not exist on type 'SceneNode'
    if (node.children) {
      //@ts-ignore
      getAllChildNodes(node.children, result);
    }
  });
}

debugLog('plugin loaded')