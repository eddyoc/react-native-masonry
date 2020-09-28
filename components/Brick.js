import React, { Component, Fragment } from 'react';
import { View, Image, TouchableHighlight } from 'react-native';
import Injector from 'react-native-injectable-component';

export default function Brick (props) {
  // Avoid margins for first element
  const { gutter } = props;
  console.log('Brick : props = '+ JSON.stringify(props));
  // const image = (props.onPress) ? _getTouchableUnit(props, props.gutter) : _getImageTag(props, props.gutter);
  const image = _getImageTag(props, gutter);
  const footer = (props.renderFooter) ? props.renderFooter(props.data) : null;
  const header = (props.renderHeader) ? props.renderHeader(props.data) : null;

  return (
    <View key={props.brickKey}>
      {header}
      {image}
      {footer}
    </View>
  );
}

// _getImageTag :: Image, Gutter -> ImageTag
export function _getImageTag (props, gutter = 0) {
  const { customImageProps, customImageComponent } = props;
  const imageProps = {
    key: props.uri,
    source: {
      uri: props.uri
    },
    resizeMethod: 'auto',
    style: {
      ...props.imageContainerStyle,

      width: props.width,
      height: props.height,
      marginTop: gutter,
    }
  };

  console.log('_getImageTag imageProps = ' + JSON.stringify(imageProps));
  console.log('_getImageTag customImageProps = ' + JSON.stringify(customImageProps));

  // return (<Fragment />);
  return (
    <Injector
      defaultComponent={Image}
      defaultProps={imageProps}
      // injectant={customImageComponent}
      // injectantProps={props.customImageProps}
    />
  )
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
