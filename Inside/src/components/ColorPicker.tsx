import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  // Blues
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  // Greens
  '#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80',
  // Reds
  '#7f1d1d', '#991b1b', '#dc2626', '#ef4444', '#f87171', '#fca5a5',
  // Purples
  '#581c87', '#7c2d12', '#a21caf', '#c026d3', '#d946ef', '#e879f9',
  // Oranges
  '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74',
  // Yellows
  '#a16207', '#ca8a04', '#eab308', '#facc15', '#fde047', '#fef08a',
  // Grays
  '#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db',
  // Whites/Light
  '#f9fafb', '#ffffff',
];

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange, label }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(color);

  const handleColorSelect = (newColor: string) => {
    setSelectedColor(newColor);
    onColorChange(newColor);
    setShowModal(false);
  };

  const isValidHex = (hex: string) => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
  };

  const getContrastColor = (hexColor: string) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.colorPreview, { backgroundColor: color }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.colorText, { color: getContrastColor(color) }]}>
          {color.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Color</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.colorGrid}>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((presetColor, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: presetColor },
                      selectedColor === presetColor && styles.selectedSwatch,
                    ]}
                    onPress={() => handleColorSelect(presetColor)}
                  >
                    {selectedColor === presetColor && (
                      <Text style={[styles.checkmark, { color: getContrastColor(presetColor) }]}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.customSection}>
              <Text style={styles.sectionTitle}>Current Color</Text>
              <View style={styles.currentColorPreview}>
                <View style={[styles.currentColorSwatch, { backgroundColor: selectedColor }]} />
                <Text style={styles.currentColorText}>{selectedColor.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#374151',
  },
  colorPreview: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  colorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: screenWidth * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
  },
  colorGrid: {
    maxHeight: 300,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorSwatch: {
    width: (screenWidth * 0.9 - 80) / 6,
    height: (screenWidth * 0.9 - 80) / 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSwatch: {
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  customSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  currentColorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentColorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

export default ColorPicker;