import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
  Alert,
} from 'react-native';
import {
  Workflow,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowConnection,
  DraggedNode,
  DesignerState,
} from '../types/workflow';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WorkflowDesignerProps {
  workflow: Workflow;
  onWorkflowChange: (workflow: Workflow) => void;
  readOnly?: boolean;
}

// Node type configurations
const nodeTypeConfig: Record<WorkflowNodeType, { icon: string; color: string; description: string }> = {
  form: { icon: '📝', color: '#3b82f6', description: 'Collect visitor information' },
  approval: { icon: '✅', color: '#10b981', description: 'Require approval to proceed' },
  condition: { icon: '🔀', color: '#f59e0b', description: 'Branch based on conditions' },
  notification: { icon: '📧', color: '#8b5cf6', description: 'Send notifications' },
  delay: { icon: '⏱️', color: '#6b7280', description: 'Wait before proceeding' },
  assignment: { icon: '👤', color: '#ec4899', description: 'Assign to staff member' },
};

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  workflow,
  onWorkflowChange,
  readOnly = false,
}) => {
  const { theme } = useTheme();
  const [designerState, setDesignerState] = useState<DesignerState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    isConnecting: false,
  });
  
  const canvasRef = useRef<View>(null);
  const [canvasSize, setCanvasSize] = useState({ width: screenWidth, height: screenHeight * 0.6 });

  // Create a new node
  const createNode = (type: WorkflowNodeType, position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      name: `New ${type} node`,
      config: {},
      position,
      nextNodes: [],
    };

    const updatedWorkflow = {
      ...workflow,
      nodes: [...workflow.nodes, newNode],
    };

    // If this is the first node, make it the start node
    if (workflow.nodes.length === 0) {
      updatedWorkflow.startNodeId = newNode.id;
    }

    onWorkflowChange(updatedWorkflow);
  };

  // Start connecting nodes
  const startConnecting = (nodeId: string) => {
    setDesignerState({
      ...designerState,
      isConnecting: true,
      connectingFromNode: nodeId,
    });
  };

  // Complete connection
  const completeConnection = (toNodeId: string) => {
    if (!designerState.connectingFromNode || designerState.connectingFromNode === toNodeId) {
      return;
    }

    const fromNode = workflow.nodes.find(n => n.id === designerState.connectingFromNode);
    if (!fromNode) return;

    // Update the from node's nextNodes
    const updatedNodes = workflow.nodes.map(node => {
      if (node.id === designerState.connectingFromNode) {
        return {
          ...node,
          nextNodes: [...node.nextNodes, toNodeId],
        };
      }
      return node;
    });

    // Create a new connection
    const newConnection: WorkflowConnection = {
      id: `conn_${Date.now()}`,
      fromNode: designerState.connectingFromNode,
      toNode: toNodeId,
    };

    onWorkflowChange({
      ...workflow,
      nodes: updatedNodes,
      connections: [...workflow.connections, newConnection],
    });

    setDesignerState({
      ...designerState,
      isConnecting: false,
      connectingFromNode: undefined,
    });
  };

  // Delete a node
  const deleteNode = (nodeId: string) => {
    Alert.alert(
      'Delete Node',
      'Are you sure you want to delete this node?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Remove the node
            const updatedNodes = workflow.nodes.filter(n => n.id !== nodeId);
            
            // Remove connections to/from this node
            const updatedConnections = workflow.connections.filter(
              c => c.fromNode !== nodeId && c.toNode !== nodeId
            );
            
            // Update nextNodes in other nodes
            const finalNodes = updatedNodes.map(node => ({
              ...node,
              nextNodes: node.nextNodes.filter(id => id !== nodeId),
            }));

            onWorkflowChange({
              ...workflow,
              nodes: finalNodes,
              connections: updatedConnections,
              startNodeId: workflow.startNodeId === nodeId ? '' : workflow.startNodeId,
            });
          },
        },
      ]
    );
  };

  // Render a workflow node
  const renderNode = (node: WorkflowNode) => {
    const config = nodeTypeConfig[node.type];
    const isSelected = designerState.selectedNodeId === node.id;
    const isStartNode = workflow.startNodeId === node.id;

    return (
      <TouchableOpacity
        key={node.id}
        style={[
          styles.node,
          {
            backgroundColor: config.color,
            left: node.position.x,
            top: node.position.y,
            borderWidth: isSelected ? 3 : 1,
            borderColor: isSelected ? theme.colors.primary : 'white',
            transform: [{ scale: designerState.zoom }],
          },
        ]}
        onPress={() => {
          if (designerState.isConnecting) {
            completeConnection(node.id);
          } else {
            setDesignerState({ ...designerState, selectedNodeId: node.id });
          }
        }}
        onLongPress={() => !readOnly && deleteNode(node.id)}
        activeOpacity={0.8}
      >
        {isStartNode && (
          <View style={styles.startBadge}>
            <Text style={styles.startBadgeText}>START</Text>
          </View>
        )}
        <Text style={styles.nodeIcon}>{config.icon}</Text>
        <Text style={styles.nodeName} numberOfLines={2}>
          {node.name}
        </Text>
        {!readOnly && (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => startConnecting(node.id)}
          >
            <Text style={styles.connectButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render connections between nodes
  const renderConnection = (connection: WorkflowConnection) => {
    const fromNode = workflow.nodes.find(n => n.id === connection.fromNode);
    const toNode = workflow.nodes.find(n => n.id === connection.toNode);
    
    if (!fromNode || !toNode) return null;

    const x1 = fromNode.position.x + 60;
    const y1 = fromNode.position.y + 40;
    const x2 = toNode.position.x + 60;
    const y2 = toNode.position.y + 40;

    // Simple line for now (could be improved with SVG curves)
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

    return (
      <View
        key={connection.id}
        style={[
          styles.connection,
          {
            left: x1,
            top: y1,
            width: length,
            transform: [
              { rotate: `${angle}deg` },
              { scale: designerState.zoom },
            ],
          },
        ]}
      >
        <View style={styles.connectionArrow} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      {!readOnly && (
        <View style={[styles.toolbar, { backgroundColor: theme.colors.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(nodeTypeConfig).map(([type, config]) => (
              <TouchableOpacity
                key={type}
                style={[styles.toolbarItem, { backgroundColor: config.color }]}
                onPress={() => {
                  const position = {
                    x: 50 + Math.random() * 200,
                    y: 50 + Math.random() * 200,
                  };
                  createNode(type as WorkflowNodeType, position);
                }}
              >
                <Text style={styles.toolbarIcon}>{config.icon}</Text>
                <Text style={styles.toolbarLabel}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Canvas */}
      <View
        style={[styles.canvas, { backgroundColor: theme.colors.background }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ width, height });
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.canvasContent}>
            {/* Render connections first (behind nodes) */}
            {workflow.connections.map(renderConnection)}
            
            {/* Render nodes */}
            {workflow.nodes.map(renderNode)}

            {/* Connection preview */}
            {designerState.isConnecting && designerState.connectingFromNode && (
              <View style={styles.connectingHint}>
                <Text style={styles.connectingHintText}>
                  Tap another node to connect
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Selected node details */}
      {designerState.selectedNodeId && (
        <View style={[styles.nodeDetails, { backgroundColor: theme.colors.surface }]}>
          {(() => {
            const selectedNode = workflow.nodes.find(n => n.id === designerState.selectedNodeId);
            if (!selectedNode) return null;
            const config = nodeTypeConfig[selectedNode.type];
            
            return (
              <>
                <View style={styles.nodeDetailsHeader}>
                  <Text style={styles.nodeDetailsIcon}>{config.icon}</Text>
                  <Text style={[styles.nodeDetailsTitle, { color: theme.colors.text }]}>
                    {selectedNode.name}
                  </Text>
                </View>
                <Text style={[styles.nodeDetailsDescription, { color: theme.colors.textSecondary }]}>
                  {config.description}
                </Text>
                {!readOnly && (
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      // TODO: Open node configuration modal
                      Alert.alert('Edit Node', 'Node configuration coming soon!');
                    }}
                  >
                    <Text style={styles.editButtonText}>Configure</Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toolbarItem: {
    width: 70,
    height: 60,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  toolbarLabel: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  canvasContent: {
    width: screenWidth * 2,
    height: screenHeight * 2,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    width: 120,
    height: 80,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nodeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  nodeName: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  startBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  startBadgeText: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  connectButton: {
    position: 'absolute',
    right: -10,
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: 'bold',
  },
  connection: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#9ca3af',
    transformOrigin: '0 50%',
  },
  connectionArrow: {
    position: 'absolute',
    right: -8,
    top: -3,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#9ca3af',
    transform: [{ rotate: '45deg' }],
  },
  connectingHint: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
  },
  connectingHintText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  nodeDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  nodeDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeDetailsIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  nodeDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  nodeDetailsDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  editButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default WorkflowDesigner;