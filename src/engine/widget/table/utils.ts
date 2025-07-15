import { ROOT } from "@/engine/constants";
import $, { NodeModel } from "@/engine/core/node";
import { walkTree } from "@/engine/utils/node";
import { decodeCardValue, escape } from "@/engine/utils/string";
import isInteger from "lodash-es/isInteger";

/**
 * 提取表格数据模型
 *
 * 此函数将HTML表格结构转换为逻辑数据模型，便于处理复杂的表格结构，尤其是含有合并单元格的表格。
 * 处理过程包括以下几个阶段：
 * 1. 构建基础表格模型，处理合并单元格
 * 2. 标记被合并单元格覆盖的区域
 * 3. 标准化表格结构，确保所有行有相同数量的列
 * 4. 填充缺失的单元格位置
 *
 * @param {HTMLTableElement} table - 表格DOM元素
 * @return {Object} 表格数据模型，包含行数、列数和单元格数组
 *
 * 表格单元格模型(tdModel)的属性说明:
 * - rowSpan {number} 单元格跨越的行数
 * - colSpan {number} 单元格跨越的列数
 * - isMulti {boolean} 是否是合并单元格(rowSpan>1或colSpan>1)
 * - isEmpty {boolean} 是否是被合并覆盖的占位单元格
 * - isShadow {boolean} 是否是补充的虚拟单元格(用于修复表格结构)
 * - parent {Object} 占位单元格的父单元格坐标 {row, col}
 * - element {HTMLTableCellElement} 指向实际DOM中的单元格元素
 */
export const getTableModel = (table: HTMLTableElement) => {
  // 初始化表格数据模型(二维数组)
  let model: any[][] = [];
  const rows = table.rows;
  const rowCount = rows.length;

  // 第一阶段: 构建基础表格模型
  // 遍历表格的每一行
  for (let r = 0; r < rowCount; r++) {
    const tr = rows[r];
    const cells = tr.cells;
    const cellCount = cells.length;

    // 遍历当前行的每个单元格
    for (let c = 0; c < cellCount; c++) {
      const td = cells[c];

      // 获取并规范化rowSpan和colSpan值(处理undefined情况)
      let { rowSpan, colSpan } = td;
      rowSpan = rowSpan === void 0 ? 1 : rowSpan;
      colSpan = colSpan === void 0 ? 1 : colSpan;

      // 判断是否是合并单元格
      const isMulti = rowSpan > 1 || colSpan > 1;

      // 确保当前行在模型中存在
      model[r] = model[r] || [];

      // 查找当前行中可用的列位置
      // 如果当前位置已被占用(由之前的合并单元格覆盖)，则向右移动
      let _c = c;
      while (model[r][_c]) {
        _c++;
      }

      // 在找到的位置记录单元格信息
      model[r][_c] = {
        rowSpan: rowSpan,
        colSpan: colSpan,
        isMulti: isMulti,
        element: td,
      };

      // 第二阶段: 处理合并单元格
      // 如果是合并单元格，需要标记被它覆盖的区域
      if (isMulti) {
        // 遍历被当前单元格覆盖的所有单元格位置
        let _rowCount = rowSpan;
        while (_rowCount > 0) {
          let colCount = colSpan;
          while (colCount > 0) {
            // 跳过单元格自身位置(r,_c)
            if (colCount !== 1 || _rowCount !== 1) {
              // 计算被覆盖单元格的位置
              const rowIndex = r + _rowCount - 1;
              const colIndex = _c + colCount - 1;

              // 确保该位置所在行在模型中存在
              model[rowIndex] = model[rowIndex] || [];

              // 标记该位置为被覆盖状态，并记录父单元格位置
              model[rowIndex][colIndex] = {
                isEmpty: true, // 表示这是被合并覆盖的位置
                parent: {
                  row: r, // 记录父单元格行索引
                  col: _c, // 记录父单元格列索引
                },
                element: null, // 该位置没有实际DOM元素
              };
            }
            colCount--;
          }
          _rowCount--;
        }
      }
    }
  }

  // 第三阶段: 标准化表格结构
  // 计算每行的列数
  const colCounts = model.map((trModel) => {
    return trModel.length;
  });

  // 确定表格的最大列数
  const MaxColCount = Math.max.apply(Math, [...colCounts]);

  // 第四阶段: 填充缺失的单元格位置
  model.forEach((trModel) => {
    // 处理列数不足的行，添加虚拟单元格补齐
    if (trModel.length < MaxColCount) {
      let addCount = MaxColCount - trModel.length;
      while (addCount--) {
        // 添加标记为isShadow的虚拟单元格
        trModel.push({
          rowSpan: 1,
          colSpan: 1,
          isShadow: true, // 表示这是补充的虚拟单元格
          element: null,
        });
      }
    }

    // 处理行内的空洞(可能由于数组稀疏导致)
    for (let i = 0; i < MaxColCount; i++) {
      if (!trModel[i]) {
        // 填充空洞位置
        trModel[i] = {
          rowSpan: 1,
          colSpan: 1,
          isShadow: true, // 表示这是补充的虚拟单元格
          element: null,
        };
      }
    }
  });

  // 构造返回结果
  const result = {
    rows: model.length, // 总行数
    cols: MaxColCount, // 总列数
    width: table.offsetWidth, // 表格宽度
    table: model, // 完整的表格数据模型
  };

  return result;
};

/**
 * 过滤表格中的首行空tr
 *
 * 解决问题：当从网页复制表格内容时，如果表格尾部有空白单元格，
 * 复制得到的HTML可能会在头部莫名其妙地生成一个空的tr元素，
 * 这个函数用于删除这种无用的空行。
 *
 * @param {NodeModel} table - 表格节点对象
 */
export const trimStartTr = (table: NodeModel) => {
  // 查找表格中的第一个tr元素
  const tr = table.find("tr");

  // 如果找到了tr且它没有子节点(即空行)，则移除它
  if (tr[0].childNodes.length === 0) {
    tr.remove();
  }
};
/**
 * 修复从Numbers应用程序复制过来的表格结构缺失问题
 *
 * 该函数专门处理从Apple Numbers等电子表格软件复制的表格HTML，
 * 这类表格常常会省略某些行，需要通过分析现有单元格的跨行跨列情况
 * 来重建完整的表格结构。
 *
 * @param {HTMLTableElement} table - 原始HTML表格元素
 */
const fixNumberTr = (table: HTMLTableElement) => {
  // 获取表格所有行和行数
  const rows = table.rows;
  const rowCount = rows.length;

  // 初始化关键数据结构
  let colCounts: any[] = []; // 存储每行的实际列数(考虑跨行单元格)
  let firstColCount = 1; // 第一行的单元格个数(列数)
  let cellCounts: any[] = []; // 每行单元格的数量
  let totalCellCounts = 0; // 表格中所有单元格的总数(包括跨行跨列)
  let emptyCounts = 0; // 由于跨行合并导致的"缺失"单元格数量

  // 记录表格中出现的最大列数，表格最终列数至少应等于此值
  let maxCellCounts = 0;

  // 第一阶段：遍历表格收集基本信息
  for (let r = 0; r < rowCount; r++) {
    const row = rows[r];
    const cells = row.cells;
    let cellCountThisRow = 0; // 当前行的单元格数(考虑colSpan)

    // 遍历当前行的所有单元格
    for (let c = 0; c < cells.length; c++) {
      const { rowSpan, colSpan } = cells[c];

      // 累计单元格总数(考虑跨行跨列)
      totalCellCounts += rowSpan * colSpan;

      // 累计当前行的单元格数(考虑跨列)
      cellCountThisRow += colSpan;

      // 记录因跨行导致"缺失"的单元格数
      if (rowSpan > 1) {
        emptyCounts += (rowSpan - 1) * colSpan;
      }
    }

    // 记录每行的单元格数
    cellCounts[r] = cellCountThisRow;

    // 记录第一行的单元格数
    if (r === 0) {
      firstColCount = cellCountThisRow;
    }

    // 更新最大列数
    maxCellCounts = Math.max(cellCountThisRow, maxCellCounts);
  }

  // 第二阶段：判断是否为Numbers表格并修复

  // 判断是否是Numbers拷贝的表格：两个条件
  // 1. 总单元格数可以被第一行单元格数整除(矩阵结构)
  const isNumber1 = isInteger(totalCellCounts / firstColCount);
  // 2. 第一行单元格数等于最大单元格数(第一行是完整的)
  const isNumber2 = firstColCount === maxCellCounts;
  // 同时满足两个条件才可能是Numbers表格
  const isNumber = isNumber1 && isNumber2;

  // 如果确认是Numbers表格，则进行修复
  if (isNumber) {
    // 计算由于行数不足导致的单元格缺失数
    let lossCellCounts = 0;
    cellCounts.forEach((cellCount) => {
      lossCellCounts += maxCellCounts - cellCount;
    });

    // 如果因缺行导致的缺失单元格数与跨行合并导致的缺失单元格数不一致
    // 说明表格结构有问题，需要补充缺失的行
    if (lossCellCounts !== emptyCounts) {
      const missCellCounts = emptyCounts - lossCellCounts;

      // 如果缺失的单元格数是最大列数的整数倍，则可以通过添加行来修复
      if (isInteger(missCellCounts / maxCellCounts)) {
        let lossRowIndex = []; // 记录需要在哪些位置插入新行

        // 第三阶段：确定需要插入新行的位置
        for (let _r = 0; _r < rowCount; _r++) {
          const _row = rows[_r];
          const _cells = _row.cells;

          // 计算实际行索引(考虑之前已确定的缺失行)
          let realRow: number = _r + lossRowIndex.length;

          // 如果当前位置的实际列数已经达到最大列数，说明这里缺少行
          // 因为跨行单元格占用了虚拟的行，导致colCounts中记录的列数已满
          while (colCounts[realRow] === maxCellCounts) {
            lossRowIndex.push(realRow); // 记录缺失行的位置
            realRow++;
          }

          // 更新colCounts，反映跨行单元格对后续行的影响
          for (let _c2 = 0; _c2 < _cells.length; _c2++) {
            const { rowSpan, colSpan } = _cells[_c2];
            if (rowSpan > 1) {
              for (let rr = 1; rr < rowSpan; rr++) {
                colCounts[realRow + rr] =
                  (colCounts[realRow + rr] || 0) + colSpan;
              }
            }
          }
        }

        // 第四阶段：在确定的位置插入新行
        lossRowIndex.forEach((row) => {
          table.insertRow(row);
        });
      }
    }
  }
};

/**
 * 将代码块卡片解构为普通段落
 *
 * 此函数用于将编辑器中的代码块卡片(data-lake-card="codeblock")
 * 转换为普通段落(p标签)，通常在表格单元格中需要这样处理，
 * 因为表格单元格中不适合包含复杂的代码块卡片。
 *
 * @param {NodeModel} node - 要处理的节点
 */
export const unWrapperCodeBlock = (node: NodeModel) => {
  // 检查节点是否为代码块卡片
  if (node.isBlock() && "codeblock" === node.attr("data-lake-card")) {
    // 解码卡片的值数据
    const value = decodeCardValue(node.attr("data-card-value") as string);

    // 如果存在code属性，则处理代码内容
    if (value.code) {
      // 按行分割代码
      const lines: string[] = value.code.split("\n");

      // 创建段落模板
      const p = $("<p />");

      // 为每行代码创建一个段落
      lines.forEach((line) => {
        // 克隆段落模板
        const cloneLine = p.clone();

        // 设置段落内容，处理特殊字符：
        // 1. escape() - 转义HTML特殊字符
        // 2. 替换制表符为两个空格
        // 3. 替换普通空格为不间断空格(&nbsp;)，保持格式
        cloneLine.html(
          escape(line).replace(/\t/g, "&nbsp;&nbsp;").replace(/\s/g, "&nbsp;")
        );

        // 将处理后的段落插入到原代码块之前
        node.before(cloneLine);
      });

      // 移除原始代码块卡片
      node.remove();
    }
  }
};

/**
 * 标准化表格单元格内容格式
 *
 * 这个函数负责处理表格单元格内容的格式标准化，主要完成以下任务：
 * 1. 将标题(h1-h6)转换为带有对应字体大小的span标签
 * 2. 确保链接在新窗口打开(添加target="_blank")
 * 3. 处理单元格内的代码块，转换为普通段落
 *
 * @param {NodeModel} table - 表格节点
 */
export const normalizeTdContent = (table: NodeModel) => {
  // 遍历表格中的所有节点
  walkTree(table, (node: NodeModel): undefined => {
    // 转换为NodeModel对象，确保可以使用DOM操作API
    node = $(node);

    // 处理块级元素，特别是标题元素
    if (node.isBlock()) {
      let replacer;

      // 根据标题级别选择对应的字体大小类
      switch (node.name) {
        case "h1":
          // h1转换为18px字体大小的span
          replacer = $('<span class="lake-fontsize-18"></span>');
          replacer.html(node.html());
          break;

        case "h2":
          // h2转换为16px字体大小的span
          replacer = $('<span class="lake-fontsize-16"></span>');
          replacer.html(node.html());
          break;

        case "h3":
        case "h4":
          // h3和h4转换为14px字体大小的span
          replacer = $('<span class="lake-fontsize-14"></span>');
          replacer.html(node.html());
          break;

        case "h5":
        case "h6":
          // h5和h6转换为12px字体大小的span
          replacer = $('<span class="lake-fontsize-12"></span>');
          replacer.html(node.html());
          break;

        default:
          break;
      }

      // 如果创建了替换元素，则替换原始节点
      if (replacer) {
        node.replaceWith(replacer);
      }
    }

    // 处理链接元素
    if (node.name === "a") {
      const url = (node.attr("href") as string) || "";
      // 确保非锚点链接在新窗口打开
      if (url && url.charAt(0) !== "#" && !node.attr("target")) {
        node.attr("target", "_blank");
      }
    }

    // 处理代码块卡片
    unWrapperCodeBlock(node);

    return undefined;
  });
};
/**
 * table 结构标准化，补齐丢掉的单元格和行
 * 场景1. number 拷贝过来的 html 中，如果这一行没有单元格，就会省掉 tr，渲染的时候会有问题
 * 场景2. 从网页中鼠标随意选取表格中的一部分，会丢掉没有选中的单元格，需要补齐单元格
 * @param {nativeNode} table 表格 Dom
 * @return {nativeNode} 修复过的 table dom
 */

/**
 * 表格结构标准化处理
 *
 * 这个函数是表格处理的主要入口，负责对表格结构进行全面的规范化处理，包括：
 * 1. 删除表格开头的空行
 * 2. 修复从Apple Numbers复制的表格结构
 * 3. 标准化单元格内容格式
 * 4. 处理表格宽度和单位转换
 * 5. 修复表格列结构
 * 6. 补齐缺失的单元格
 * 7. 统一设置行高
 *
 * @param {HTMLTableElement} table - 需要处理的表格节点
 * @returns {NodeModel} - 处理后的表格节点
 */
export const normalizeTable = (table: HTMLTableElement) => {
  const $table = $(table);

  // 删除表格开头的空行
  trimStartTr($table);

  // 修复从Apple Numbers复制的表格结构
  fixNumberTr($table[0] as HTMLTableElement);

  // 标准化单元格内容（处理标题、链接等）
  normalizeTdContent($table);

  // 添加编辑器表格类名
  $table.addClass(`${ROOT}-table`);

  // 修正表格宽度为 pt 场景
  const width = $table.css("width");

  // 处理表格宽度
  if (parseInt(width) === 0) {
    // 宽度为0时设置为自动宽度
    $table.css("width", "auto");
  } else {
    // pt 直接转为 px, 因为 col 的 width 属性是没有单位的，会直接被理解为 px
    // 这里 table 的 width 也直接换成 px
    $table.css("width", parseInt(width, 10) + "px");
  }

  // 表格 table 标签不允许有背景色，清除背景色设置
  $table.css("background-color", "");

  // 获取表格模型结构
  const model = getTableModel($table[0] as HTMLTableElement);

  // 修正列的 span 场景（处理 colspan）
  let cols = $table.find("col") as unknown as HTMLTableColElement[];
  if (cols.length !== 0) {
    // 从右向左处理列，避免处理过程中的索引变化影响
    for (let c = cols.length - 1; c >= 0; c--) {
      // 处理列宽
      const _width = $(cols[c]).attr("width") as string;
      if (_width) {
        $(cols[c]).attr("width", parseInt(_width));
      }

      // 处理跨列（span>1）的情况，需要复制多个 col 元素
      if (cols[c].span > 1) {
        let addCount = cols[c].span - 1;
        // 在当前列前插入克隆的列
        while (addCount--) {
          cols[c].parentNode?.insertBefore(cols[c].cloneNode(), cols[c]);
        }
      }
    }

    // 重新获取所有列
    cols = $table.find("col") as unknown as HTMLTableColElement[];

    // 如果col元素数量少于表格实际列数，需要补充列
    if (cols.length < model.cols) {
      const lastCol = cols.length - 1;
      let colsAddCount = model.cols - cols.length;
      // 复制最后一列来补充缺少的列
      while (colsAddCount--) {
        cols[0].parentNode?.appendChild(cols[lastCol].cloneNode());
      }
    }

    // 重置所有列的span属性为1，避免重复计算
    $table.find("col").attr("span", "1");
  }

  // 数据模型和实际DOM结构的行数不一致，需要寻找并补齐行和单元格
  model.table.forEach((tr: any, r: number) => {
    // 如果行不存在，创建新行
    if (!table.rows?.[r]) {
      table.insertRow(r);
    }

    // 查找需要补充的影子单元格（被合并单元格覆盖的位置）
    const shadow = tr.filter((td: any) => {
      return td.isShadow;
    });

    // 为影子单元格创建实际的DOM单元格
    let shadowCount = shadow.length;
    while (shadowCount--) {
      if (r === 0) {
        // 第一行在开头插入单元格
        table.rows[r].insertCell(0);
      } else {
        // 其他行在末尾插入单元格
        table.rows[r].insertCell();
      }
    }
  });

  // 修正行高，确保行高一致性
  const trs = $table.find("tr");
  trs.each((tr: Node) => {
    const $tr = $(tr);
    // 获取当前行高
    let height = $(tr).css("height");
    // 设置最小行高33px
    const heightValue = parseInt(height) || 33;
    $tr.css("height", heightValue + "px");
  });
  return table;
};
