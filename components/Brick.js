import React, { Component, Fragment } from 'react';
import { View, Image, TouchableHighlight } from 'react-native';
import Injector from 'react-native-injectable-component';

export default function Brick (props) {
  // Avoid margins for first element
  const { gutter, renderHeader, renderFooter, data, onPress, brickKey } = props;
  // console.log('Brick : props = '+ JSON.stringify(props));
  const image = (onPress) ? _getTouchableUnit(props, gutter) : _getImageTag(props, gutter);
  const footer = (renderFooter) ? renderFooter(data) : null;
  const header = (renderHeader) ? renderHeader(data) : null;

  return (
    <View key={brickKey}>
      {header}
      {image}
      {footer}
    </View>
  );
}

// _getImageTag :: Image, Gutter -> ImageTag
export function _getImageTag (props, gutter = 0) {
  const { customImageProps, imageContainerStyle, customImageComponent, uri, width, height } = props;
  const imageProps = {
    key: uri,
    source: {
      uri,
    },
    resizeMethod: 'auto',
    style: {
      width,
      height,
      marginTop: gutter,
      ...imageContainerStyle,
    }
  };

  // console.log('_getImageTag imageProps = ' + JSON.stringify(imageProps));
  // console.log('_getImageTag customImageProps = ' + JSON.stringify(customImageProps));

  // return (<Fragment />);
  return (
    <Injector
      defaultComponent={Image}
      defaultProps={imageProps}
      injectant={customImageComponent}
      injectantProps={customImageProps}
    />
  );
}

// _getTouchableUnit :: Image, Number -> TouchableTag
export function _getTouchableUnit (image, gutter = 0) {
  const { uri, data } = image;
  return (
    <TouchableHighlight
      key={uri}
      onPress={() => image.onPress(data)}
    >
      { _getImageTag(image, gutter) }
    </TouchableHighlight>
  );
}
