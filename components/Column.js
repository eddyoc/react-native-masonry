import React, { Component, Fragment } from 'react';
import { View, Image, TouchableHighlight } from 'react-native';
import styles from '../styles/main';
import PropTypes from 'prop-types';
import Brick from './Brick';

// Takes props and returns a masonry column
export default class Column extends Component {
  state = {
    width: 0,
    images: [],
  };

  static propTypes = {
    data: PropTypes.array,
    columns: PropTypes.number,
    parentDimensions: PropTypes.object,
    columnKey: PropTypes.string,
    imageContainerStyle: PropTypes.object,
    customImageComponent: PropTypes.func,
    customImageProps: PropTypes.object
  };

  componentDidMount() {
    const { data, parentDimensions, columns } = this.props;
    const images = Column._resizeImages(data, parentDimensions, columns);
    this.setState({
      images,
    });
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { data, parentDimensions, columns } = nextProps;
    const images = Column._resizeImages(data, parentDimensions, columns);

    console.log(`........... Column.getDerivedStateFromProps images=${JSON.stringify(images)}`);

    // if (this.state.columnWidth !== columnWidth) {
    //   this.setState({
    //     columnWidth
    //   });
    // }

    return {
      ...prevState,
      images,
    }
  }

  // Transforms an array of images with dimensions scaled according to the
  // column it is within
  // _resizeImages :: Data, parentDimensions. nColumns -> ResizedImage
  static _resizeImages (data, parentDimensions, nColumns) {
    const keys = Object.keys(data);
    return keys.map((key) => {
      const image = data[key];
      const imageSizedForColumn =
        Column._resizeByColumns(data[key].dimensions, parentDimensions, nColumns);
      // Return a image object that width will be equivalent to
      // the column dimension, while retaining original image properties
      const result = {
        ...image,
        ...imageSizedForColumn
      };

      console.log(`............ _resizeImages result=${JSON.stringify(result)}`);

      return result;
    });
  }

  // Resize image while maintain aspect ratio
  // _resizeByColumns :: ImgDimensions , parentDimensions, nColumns  -> AdjustedDimensions
  static _resizeByColumns (imgDimensions, parentDimensions, nColumns=2) {
    console.log(`_resizeByColumns imgDimensions=#${JSON.stringify(imgDimensions)} parentDimensions=${JSON.stringify(parentDimensions)}`)
    const { height, width } = parentDimensions;

    // The gutter is 1% of the available view width
    const gutterBase = width / 100;
    const gutterSize = gutterBase * 1;

    // Column gutters are shared between right and left image
    const columnWidth = (width / nColumns) - (gutterSize / 2);

    // if (this.state.columnWidth !== columnWidth) {
    //   this.setState({
    //     columnWidth
    //   });
    // }

    const divider = imgDimensions.width / columnWidth;

    const newWidth = imgDimensions.width / divider;
    const newHeight = imgDimensions.height / divider;

    return {
      width: newWidth,
      height: newHeight,
      gutter: gutterSize,
      columnWidth,
    };
  }

  // Renders the "bricks" within the columns
  // _renderBricks :: [images] -> [TouchableTag || ImageTag...]
  _renderBricks (bricks) {
    return bricks.map((brick, index) => {
      const gutter = (index === 0) ? 0 : brick.gutter;
      const key = `RN-MASONRY-BRICK-${brick.column}-${index}`;
      const { imageContainerStyle, customImageComponent, customImageProps } = this.props;
      const props = { ...brick, gutter, key, imageContainerStyle, customImageComponent, customImageProps };
      console.log('_renderBricks btick = ' + JSON.stringify(props));

      if (props.width) {
        return ( <Brick {...props} /> );
      }

      return ( <Fragment /> );
    });
  }

  render() {
    const { columnWidth: width, images } = this.state;
    const { columnKey } = this.props;
    const style = [{ width }, styles.masonry__column];
    console.log('Column.render');
    return (
      <View
        key={columnKey}
        style={style}
      >
        {this._renderBricks(images)}
      </View>
    )
  }
}
