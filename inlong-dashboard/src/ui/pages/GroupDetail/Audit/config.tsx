/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { sinks } from '@/plugins/sinks';

export const timeStaticsDimList = [
  {
    label: i18n.t('pages.GroupDetail.Audit.Min'),
    value: 'MINUTE',
  },
  {
    label: i18n.t('pages.GroupDetail.Audit.Hour'),
    value: 'HOUR',
  },
  {
    label: i18n.t('pages.GroupDetail.Audit.Day'),
    value: 'DAY',
  },
];

const auditList = ['Agent', 'DataProxy', 'Sort'].reduce((acc, item, index) => {
  return acc.concat([
    {
      label: `${item} ${i18n.t('pages.GroupDetail.Audit.Receive')}`,
      value: index * 2 + 3,
    },
    {
      label: `${item} ${i18n.t('pages.GroupDetail.Audit.Send')}`,
      value: index * 2 + 4,
    },
  ]);
}, []);

const auditMap = auditList.reduce(
  (acc, cur) => ({
    ...acc,
    [cur.value]: cur,
  }),
  {},
);

function getAuditLabel(auditId: number, nodeType?: string) {
  const id = +auditId;
  const item = id >= 9 ? auditMap[id % 2 ? 7 : 8] : auditMap[id];
  const label = item?.label || id;
  const sinkLabel = sinks.find(c => c.value === nodeType)?.label;
  return nodeType ? `${label}(${sinkLabel})` : label;
}

export const toChartData = (source, sourceDataMap) => {
  const xAxisData = Object.keys(sourceDataMap);
  return {
    legend: {
      data: source.map(item => item.auditName),
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
    },
    yAxis: {
      type: 'value',
    },
    series: source.map(item => ({
      name: item.auditName,
      type: 'line',
      data: xAxisData.map(logTs => sourceDataMap[logTs]?.[item.auditId] || 0),
    })),
  };
};

export const toTableData = (source, sourceDataMap) => {
  return Object.keys(sourceDataMap)
    .reverse()
    .map(logTs => ({
      ...sourceDataMap[logTs],
      logTs,
    }));
};

export const getFormContent = (inlongGroupId, initialValues, onSearch, onDataStreamSuccess) => [
  {
    type: 'select',
    label: i18n.t('pages.GroupDetail.Audit.DataStream'),
    name: 'inlongStreamId',
    props: {
      dropdownMatchSelectWidth: false,
      showSearch: true,
      options: {
        requestAuto: true,
        requestTrigger: ['onOpen', 'onSearch'],
        requestService: keyword => ({
          url: '/stream/list',
          method: 'POST',
          data: {
            keyword,
            pageNum: 1,
            pageSize: 100,
            inlongGroupId,
          },
        }),
        requestParams: {
          formatResult: result =>
            result?.list.map(item => ({
              label: item.inlongStreamId,
              value: item.inlongStreamId,
            })) || [],
          onSuccess: onDataStreamSuccess,
        },
      },
    },
    rules: [{ required: true }],
  },
  {
    type: 'select',
    label: i18n.t('pages.GroupDetail.Audit.Sink'),
    name: 'sinkId',
    props: values => ({
      dropdownMatchSelectWidth: false,
      showSearch: true,
      options: {
        requestTrigger: ['onOpen', 'onSearch'],
        requestService: keyword => ({
          url: '/sink/list',
          method: 'POST',
          data: {
            keyword,
            pageNum: 1,
            pageSize: 100,
            inlongGroupId,
            inlongStreamId: values.inlongStreamId,
          },
        }),
        requestParams: {
          formatResult: result =>
            result?.list.map(item => ({
              label: item.sinkName + ` ( ${sinks.find(c => c.value === item.sinkType)?.label} )`,
              value: item.id,
            })) || [],
        },
      },
    }),
  },
  {
    type: 'datepicker',
    label: i18n.t('pages.GroupDetail.Audit.StartDate'),
    name: 'startDate',
    initialValue: dayjs(initialValues.startDate),
    props: {
      allowClear: false,
      format: 'YYYY-MM-DD',
    },
  },
  {
    type: 'datepicker',
    label: i18n.t('pages.GroupDetail.Audit.EndDate'),
    name: 'endDate',
    initialValues: dayjs(initialValues.endDate),
    props: {
      allowClear: false,
      format: 'YYYY-MM-DD',
      disabledDate: current => {
        const start = dayjs(initialValues.startDate);
        const dim = initialValues.timeStaticsDim;
        if (dim === 'HOUR' || dim === 'DAY') {
          const tooLate = current && current <= start.endOf('day');
          const tooEarly = start && current > start.add(7, 'd').endOf('day');
          return tooLate || tooEarly;
        }
        const tooLate = current && current >= start.endOf('day');
        const tooEarly = start && current < start.add(-1, 'd').endOf('day');
        return tooLate || tooEarly;
      },
    },
  },
  {
    type: 'select',
    label: i18n.t('pages.GroupDetail.Audit.TimeStaticsDim'),
    name: 'timeStaticsDim',
    initialValue: initialValues.timeStaticsDim,
    props: {
      dropdownMatchSelectWidth: false,
      options: timeStaticsDimList,
    },
  },
  {
    type: 'select',
    label: i18n.t('pages.GroupDetail.Audit.Item'),
    name: 'auditIds',
    props: {
      mode: 'multiple',
      maxTagCount: 3,
      allowClear: true,
      dropdownMatchSelectWidth: false,
      options: {
        requestAuto: true,
        requestService: {
          url: '/audit/getAuditBases',
          method: 'GET',
        },
        requestParams: {
          formatResult: result =>
            result?.map(item => ({
              label: item.name,
              value: item.auditId,
            })) || [],
        },
      },
    },
  },
  {
    type: (
      <Button type="primary" onClick={onSearch}>
        {i18n.t('pages.GroupDetail.Audit.Search')}
      </Button>
    ),
  },
];

export const getTableColumns = source => {
  const data = source.map(item => ({
    title: item.auditName,
    dataIndex: item.auditId,
    render: text => text || 0,
  }));
  return [
    {
      title: i18n.t('pages.GroupDetail.Audit.Time'),
      dataIndex: 'logTs',
    },
  ].concat(data);
};
