import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Theme } from '../themes/themes';

interface FontPickerProps {
  selectedFont: string;
  onFontChange: (font: string) => void;
  theme: Theme;
  label: string;
}

// Common system fonts that work across platforms
const AVAILABLE_FONTS = [
  { name: 'System', value: 'System' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Helvetica', value: 'Helvetica' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Courier New', value: 'Courier New' },
  { name: 'Georgia', value: 'Georgia' },
  { name: 'Verdana', value: 'Verdana' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS' },
  { name: 'Palatino', value: 'Palatino' },
  { name: 'Optima', value: 'Optima' },
];

const FontPicker: React.FC<FontPickerProps> = ({
  selectedFont,
  onFontChange,
  theme,
  label,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleFontSelect = (font: string) => {
    onFontChange(font);
    setIsVisible(false);
  };

  const getDisplayFont = (fontValue: string) => {
    const font = AVAILABLE_FONTS.find(f => f.value === fontValue);
    return font ? font.name : fontValue;
  };

  const getCurrentFont = () => {
    const font = AVAILABLE_FONTS.find(f => f.value === selectedFont);
    return font || { name: selectedFont, value: selectedFont };
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      
      <TouchableOpacity
        style={[
          styles.selector,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
        onPress={() => setIsVisible(true)}
      >
        <Text
          style={[
            styles.selectedText,
            {
              color: theme.colors.text,
              fontFamily: selectedFont, // Use the selectedFont directly, not the value
            },
          ]}
        >
          {getDisplayFont(selectedFont)}
        </Text>
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Select {label}
            </Text>
            
            <ScrollView style={styles.fontList} showsVerticalScrollIndicator={false}>
              {AVAILABLE_FONTS.map((font) => (
                <TouchableOpacity
                  key={font.value}
                  style={[
                    styles.fontOption,
                    {
                      backgroundColor:
                        selectedFont === font.value
                          ? theme.colors.primary + '20'
                          : 'transparent',
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleFontSelect(font.value)}
                >
                  <Text
                    style={[
                      styles.fontOptionText,
                      {
                        color: theme.colors.text,
                        fontFamily: font.value,
                        fontWeight: selectedFont === font.value ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {font.name}
                  </Text>
                  {selectedFont === font.value && (
                    <Text style={[styles.checkmark, { color: theme.colors.primary }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
  },
  selectedText: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  fontList: {
    maxHeight: 300,
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 50,
  },
  fontOptionText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FontPicker;